import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createMyCloudWorldRequest,
  getWorldOwner,
  getMyCloudWorld,
  sendCloudPhoneCode,
  verifyCloudPhoneCode,
  type CloudWorldLookupResponse,
} from "@yinjie/contracts";
import {
  Button,
  ErrorBlock,
  InlineNotice,
  LoadingBlock,
  SetupScaffold,
  SetupStatusCard,
  SetupStepList,
  TextField,
} from "@yinjie/ui";
import { describeRequestError } from "../../../lib/request-error";
import { assertWorldReachable } from "../../../lib/world-entry";
import { setAppRuntimeConfig, useAppRuntimeConfig } from "../../../runtime/runtime-config-store";
import { useWorldOwnerStore } from "../../../store/world-owner-store";

type MobileSetupPanelProps = {
  hasOwner: boolean;
  onContinue: (ownerReady: boolean) => void;
};

type WorldAccessMode = "cloud" | "local";

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function describeCloudStatus(data?: CloudWorldLookupResponse | null) {
  switch (data?.status) {
    case "active":
      return "World active";
    case "pending":
      return "Request pending";
    case "provisioning":
      return "Provisioning in progress";
    case "rejected":
      return "Request rejected";
    case "disabled":
      return "World disabled";
    default:
      return "No cloud world found";
  }
}

export function MobileSetupPanel({ hasOwner, onContinue }: MobileSetupPanelProps) {
  const runtimeConfig = useAppRuntimeConfig();
  const hydrateOwner = useWorldOwnerStore((state) => state.hydrateOwner);
  const [mode, setMode] = useState<WorldAccessMode>(
    runtimeConfig.worldAccessMode ?? (runtimeConfig.apiBaseUrl ? "local" : "cloud"),
  );
  const [localApiBaseUrl, setLocalApiBaseUrl] = useState(runtimeConfig.apiBaseUrl ?? "");
  const [localSocketBaseUrl, setLocalSocketBaseUrl] = useState(
    runtimeConfig.socketBaseUrl ?? runtimeConfig.apiBaseUrl ?? "",
  );
  const [cloudApiBaseUrl, setCloudApiBaseUrl] = useState(runtimeConfig.cloudApiBaseUrl ?? "");
  const [phone, setPhone] = useState(runtimeConfig.cloudPhone ?? "");
  const [code, setCode] = useState("");
  const [worldName, setWorldName] = useState("");
  const [cloudAccessToken, setCloudAccessToken] = useState("");
  const [notice, setNotice] = useState("");
  const [continueError, setContinueError] = useState("");
  const [isContinuing, setIsContinuing] = useState(false);

  const normalizedLocalApiBaseUrl = normalizeBaseUrl(localApiBaseUrl);
  const normalizedLocalSocketBaseUrl = normalizeBaseUrl(localSocketBaseUrl);
  const normalizedCloudApiBaseUrl = normalizeBaseUrl(cloudApiBaseUrl);

  const cloudStatusQuery = useQuery({
    queryKey: ["setup-cloud-world", normalizedCloudApiBaseUrl || "default", cloudAccessToken],
    queryFn: () => getMyCloudWorld(cloudAccessToken, normalizedCloudApiBaseUrl || undefined),
    enabled: Boolean(cloudAccessToken),
    retry: false,
  });

  useEffect(() => {
    setLocalApiBaseUrl(runtimeConfig.apiBaseUrl ?? "");
    setLocalSocketBaseUrl(runtimeConfig.socketBaseUrl ?? runtimeConfig.apiBaseUrl ?? "");
    setCloudApiBaseUrl(runtimeConfig.cloudApiBaseUrl ?? "");
    setPhone(runtimeConfig.cloudPhone ?? "");
    if (runtimeConfig.worldAccessMode) {
      setMode(runtimeConfig.worldAccessMode);
    }
  }, [
    runtimeConfig.apiBaseUrl,
    runtimeConfig.cloudApiBaseUrl,
    runtimeConfig.cloudPhone,
    runtimeConfig.socketBaseUrl,
    runtimeConfig.worldAccessMode,
  ]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const sendCodeMutation = useMutation({
    mutationFn: () =>
      sendCloudPhoneCode(
        {
          phone: phone.trim(),
        },
        normalizedCloudApiBaseUrl || undefined,
      ),
    onSuccess: (result) => {
      setPhone(result.phone);
      setNotice("Verification code sent.");
      setAppRuntimeConfig({
        apiBaseUrl: undefined,
        socketBaseUrl: undefined,
        worldAccessMode: "cloud",
        cloudApiBaseUrl: normalizedCloudApiBaseUrl || undefined,
        cloudPhone: result.phone,
        cloudWorldId: undefined,
        bootstrapSource: "user",
      });
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: () =>
      verifyCloudPhoneCode(
        {
          phone: phone.trim(),
          code: code.trim(),
        },
        normalizedCloudApiBaseUrl || undefined,
      ),
    onSuccess: (result) => {
      setPhone(result.phone);
      setCode("");
      setCloudAccessToken(result.accessToken);
      setNotice("Phone verified. Checking cloud world status.");
      setAppRuntimeConfig({
        apiBaseUrl: undefined,
        socketBaseUrl: undefined,
        worldAccessMode: "cloud",
        cloudApiBaseUrl: normalizedCloudApiBaseUrl || undefined,
        cloudPhone: result.phone,
        cloudWorldId: undefined,
        bootstrapSource: "user",
      });
    },
  });

  const createWorldRequestMutation = useMutation({
    mutationFn: () =>
      createMyCloudWorldRequest(
        {
          worldName: worldName.trim(),
        },
        cloudAccessToken,
        normalizedCloudApiBaseUrl || undefined,
      ),
    onSuccess: async () => {
      setNotice("Cloud world request submitted.");
      await cloudStatusQuery.refetch();
    },
  });

  const currentCloudWorld = cloudStatusQuery.data?.world ?? null;
  const cloudCanContinue = Boolean(
    cloudStatusQuery.data?.status === "active" && currentCloudWorld?.apiBaseUrl,
  );
  const cloudCanRequestWorld =
    Boolean(cloudAccessToken) &&
    (cloudStatusQuery.data?.status === "none" || cloudStatusQuery.data?.status === "rejected");
  const localCanContinue = Boolean(normalizedLocalApiBaseUrl);
  const configuredWorldSummary =
    runtimeConfig.worldAccessMode === "cloud"
      ? runtimeConfig.cloudWorldId || runtimeConfig.cloudPhone || "Cloud world pending confirmation"
      : runtimeConfig.apiBaseUrl || "Not configured";

  useEffect(() => {
    setContinueError("");
  }, [mode, normalizedLocalApiBaseUrl, currentCloudWorld?.apiBaseUrl]);

  const steps = useMemo(() => {
    if (mode === "cloud") {
      return [
        {
          label: "Choose cloud",
          hint:
            normalizedCloudApiBaseUrl ||
            runtimeConfig.cloudApiBaseUrl ||
            "Use the default cloud platform endpoint.",
          ok: true,
        },
        {
          label: "Verify phone",
          hint: phone.trim()
            ? `Current phone: ${phone.trim()}`
            : "Enter a phone number and verify with the code.",
          ok: Boolean(cloudAccessToken),
        },
        {
          label: "World status",
          hint:
            currentCloudWorld?.apiBaseUrl ??
            cloudStatusQuery.data?.latestRequest?.note ??
            describeCloudStatus(cloudStatusQuery.data),
          ok: cloudCanContinue,
        },
      ];
    }

    return [
      {
        label: "Choose local",
        hint: "Enter your own world instance address.",
        ok: true,
      },
      {
        label: "World API",
        hint: normalizedLocalApiBaseUrl || "Fill in a reachable world address.",
        ok: Boolean(normalizedLocalApiBaseUrl),
      },
      {
        label: "Ready to enter",
        hint: localCanContinue
          ? "Address saved. You can continue into the world."
          : "Save a valid address before continuing.",
        ok: localCanContinue,
      },
    ];
  }, [
    cloudCanContinue,
    cloudStatusQuery.data,
    currentCloudWorld?.apiBaseUrl,
    localCanContinue,
    mode,
    normalizedCloudApiBaseUrl,
    normalizedLocalApiBaseUrl,
    phone,
    runtimeConfig.cloudApiBaseUrl,
  ]);

  function saveLocalWorld() {
    setAppRuntimeConfig({
      apiBaseUrl: normalizedLocalApiBaseUrl || undefined,
      socketBaseUrl: normalizedLocalSocketBaseUrl || normalizedLocalApiBaseUrl || undefined,
      worldAccessMode: "local",
      cloudPhone: undefined,
      cloudWorldId: undefined,
      bootstrapSource: "user",
      configStatus: normalizedLocalApiBaseUrl ? "configured" : "unconfigured",
    });
    setNotice("Local world entry saved.");
  }

  async function continueWithLocalWorld() {
    if (!normalizedLocalApiBaseUrl) {
      return;
    }

    setIsContinuing(true);
    setContinueError("");

    try {
      await assertWorldReachable(normalizedLocalApiBaseUrl);
      saveLocalWorld();
      const owner = await getWorldOwner(normalizedLocalApiBaseUrl);
      hydrateOwner(owner);
      onContinue(owner.onboardingCompleted);
    } catch (error) {
      setContinueError(describeRequestError(error, "当前世界地址暂时不可用，请检查后再试。"));
    } finally {
      setIsContinuing(false);
    }
  }

  async function continueWithCloudWorld() {
    if (!cloudCanContinue || !currentCloudWorld?.apiBaseUrl) {
      return;
    }

    setIsContinuing(true);
    setContinueError("");

    try {
      await assertWorldReachable(currentCloudWorld.apiBaseUrl);
      setAppRuntimeConfig({
        apiBaseUrl: currentCloudWorld.apiBaseUrl,
        socketBaseUrl: currentCloudWorld.apiBaseUrl,
        worldAccessMode: "cloud",
        cloudApiBaseUrl: normalizedCloudApiBaseUrl || undefined,
        cloudPhone: phone.trim() || runtimeConfig.cloudPhone,
        cloudWorldId: currentCloudWorld.id,
        bootstrapSource: "user",
        configStatus: "configured",
      });
      const owner = await getWorldOwner(currentCloudWorld.apiBaseUrl);
      hydrateOwner(owner);
      onContinue(owner.onboardingCompleted);
    } catch (error) {
      setContinueError(describeRequestError(error, "云世界暂时不可用，请稍后再试。"));
    } finally {
      setIsContinuing(false);
    }
  }

  function selectMode(nextMode: WorldAccessMode) {
    setMode(nextMode);
    setNotice("");
    if (nextMode === "local") {
      return;
    }

    setCloudAccessToken("");
    setCode("");
  }

  const modeButtonClassName = "flex-1 rounded-2xl";

  return (
    <SetupScaffold
      badge="World Entry"
      title="Choose which world to enter first."
      description="Before entering the client, choose whether this device connects to an official cloud world or your own self-hosted world."
      heroAside={<SetupStepList steps={steps} />}
      left={
        <div className="space-y-5">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SetupStatusCard
              title="Current mode"
              value={mode === "cloud" ? "Cloud world" : "Local world"}
              detail={
                mode === "cloud"
                  ? "Find an official cloud world by phone number."
                  : "Connect directly to your own instance address."
              }
              ok
            />
            <SetupStatusCard
              title="Current entry"
              value={configuredWorldSummary}
              detail="Switching the world entry updates the runtime configuration saved on this device."
              ok={Boolean(runtimeConfig.worldAccessMode)}
            />
            <SetupStatusCard
              title="Continue"
              value={hasOwner ? "Owner already exists" : "Owner not initialized"}
              detail={
                hasOwner
                  ? "You can continue into chat and world pages."
                  : "After confirming the entry, continue into onboarding."
              }
              ok={hasOwner}
            />
          </section>

          {notice ? <InlineNotice tone="success">{notice}</InlineNotice> : null}

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => selectMode("cloud")}
              variant={mode === "cloud" ? "primary" : "secondary"}
              size="lg"
              className={modeButtonClassName}
            >
              Enter cloud world
            </Button>
            <Button
              onClick={() => selectMode("local")}
              variant={mode === "local" ? "primary" : "secondary"}
              size="lg"
              className={modeButtonClassName}
            >
              Enter local world
            </Button>
          </div>

          {mode === "local" ? (
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={saveLocalWorld}
                disabled={!localCanContinue || isContinuing}
                variant="primary"
                size="lg"
              >
                Save local world
              </Button>
              <Button
                onClick={() => void continueWithLocalWorld()}
                disabled={!localCanContinue || isContinuing}
                variant="secondary"
                size="lg"
              >
                {isContinuing ? "Checking world..." : hasOwner ? "Enter Yinjie" : "Continue"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => sendCodeMutation.mutate()}
                disabled={!phone.trim() || sendCodeMutation.isPending}
                variant="primary"
                size="lg"
              >
                {sendCodeMutation.isPending ? "Sending..." : "Send code"}
              </Button>
              <Button
                onClick={() => verifyCodeMutation.mutate()}
                disabled={!phone.trim() || !code.trim() || verifyCodeMutation.isPending}
                variant="secondary"
                size="lg"
              >
                {verifyCodeMutation.isPending ? "Verifying..." : "Verify phone"}
              </Button>
              <Button
                onClick={() => void cloudStatusQuery.refetch()}
                disabled={!cloudAccessToken || cloudStatusQuery.isFetching}
                variant="secondary"
                size="lg"
              >
                {cloudStatusQuery.isFetching ? "Refreshing..." : "Refresh status"}
              </Button>
              <Button
                onClick={() => void continueWithCloudWorld()}
                disabled={!cloudCanContinue || isContinuing}
                variant="secondary"
                size="lg"
              >
                {isContinuing ? "Checking world..." : hasOwner ? "Enter Yinjie" : "Continue"}
              </Button>
            </div>
          )}
        </div>
      }
      right={
        <section className="rounded-[28px] border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.04))] p-5 shadow-[var(--shadow-section)]">
          {mode === "local" ? (
            <div className="space-y-4">
              <div className="text-sm font-medium text-white">Local world entry</div>
              <label className="block space-y-2">
                <span className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
                  World API URL
                </span>
                <TextField
                  value={localApiBaseUrl}
                  onChange={(event) => setLocalApiBaseUrl(event.target.value)}
                  placeholder="https://host.example.com"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
                  Socket URL
                </span>
                <TextField
                  value={localSocketBaseUrl}
                  onChange={(event) => setLocalSocketBaseUrl(event.target.value)}
                  placeholder="https://host.example.com"
                />
              </label>

              <InlineNotice tone="info">
                If the Socket URL matches the World API URL, you can keep them the same. After saving, the client will treat this as the default entry.
              </InlineNotice>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm font-medium text-white">Cloud world entry</div>

              <label className="block space-y-2">
                <span className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
                  Cloud API URL
                </span>
                <TextField
                  value={cloudApiBaseUrl}
                  onChange={(event) => setCloudApiBaseUrl(event.target.value)}
                  placeholder="https://cloud.example.com"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
                  Phone number
                </span>
                <TextField
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Enter your phone number"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
                  Verification code
                </span>
                <TextField
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Enter the verification code"
                />
              </label>

              {cloudStatusQuery.isLoading ? (
                <LoadingBlock className="px-0 py-0 text-left" label="Checking cloud world status..." />
              ) : null}
              {cloudStatusQuery.data ? (
                <InlineNotice tone={cloudCanContinue ? "success" : "info"}>
                  {cloudCanContinue
                    ? `Cloud world found: ${currentCloudWorld?.name ?? "Unnamed world"}`
                    : `Current status: ${describeCloudStatus(cloudStatusQuery.data)}`}
                </InlineNotice>
              ) : null}

              {currentCloudWorld?.apiBaseUrl ? (
                <InlineNotice tone="muted">
                  Cloud world URL: {currentCloudWorld.apiBaseUrl}
                </InlineNotice>
              ) : null}

              {cloudCanRequestWorld ? (
                <div className="space-y-3 rounded-[24px] border border-[color:var(--border-faint)] bg-black/10 p-4">
                  <div className="text-sm font-medium text-white">No cloud world yet. Submit a request first.</div>
                  <TextField
                    value={worldName}
                    onChange={(event) => setWorldName(event.target.value)}
                    placeholder="Give your world a name"
                  />
                  <Button
                    onClick={() => createWorldRequestMutation.mutate()}
                    disabled={!worldName.trim() || createWorldRequestMutation.isPending}
                    variant="primary"
                  >
                    {createWorldRequestMutation.isPending ? "Submitting..." : "Submit world request"}
                  </Button>
                </div>
              ) : null}

              {cloudStatusQuery.data?.latestRequest?.note ? (
                <InlineNotice tone="warning">
                  Platform note: {cloudStatusQuery.data.latestRequest.note}
                </InlineNotice>
              ) : null}
            </div>
          )}

          {sendCodeMutation.isError && sendCodeMutation.error instanceof Error ? (
            <ErrorBlock className="mt-4" message={sendCodeMutation.error.message} />
          ) : null}
          {verifyCodeMutation.isError && verifyCodeMutation.error instanceof Error ? (
            <ErrorBlock className="mt-4" message={verifyCodeMutation.error.message} />
          ) : null}
          {cloudStatusQuery.isError && cloudStatusQuery.error instanceof Error ? (
            <ErrorBlock className="mt-4" message={cloudStatusQuery.error.message} />
          ) : null}
          {createWorldRequestMutation.isError && createWorldRequestMutation.error instanceof Error ? (
            <ErrorBlock className="mt-4" message={createWorldRequestMutation.error.message} />
          ) : null}
          {continueError ? <ErrorBlock className="mt-4" message={continueError} /> : null}
        </section>
      }
    />
  );
}
