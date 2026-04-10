import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ReplyLogicActorSnapshot,
  ReplyLogicCharacterSnapshot,
  ReplyLogicConversationSnapshot,
  ReplyLogicHistoryItem,
  ReplyLogicNarrativeArcSummary,
  ReplyLogicOverview,
  ReplyLogicPromptSection,
  ReplyLogicStateGateSummary,
} from "@yinjie/contracts";
import {
  AppHeader,
  Button,
  Card,
  ErrorBlock,
  InlineNotice,
  LoadingBlock,
  MetricCard,
  PanelEmpty,
  SectionHeading,
  SelectField,
  SnapshotPanel,
  StatusPill,
} from "@yinjie/ui";
import { adminApi } from "../lib/admin-api";
import { resolveAdminCoreApiBaseUrl } from "../lib/core-api-base";

type InspectorScope = "character" | "conversation";

export function ReplyLogicPage() {
  const baseUrl = resolveAdminCoreApiBaseUrl();
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<InspectorScope>("character");
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("");
  const [selectedConversationId, setSelectedConversationId] = useState<string>("");

  const overviewQuery = useQuery({
    queryKey: ["admin-reply-logic-overview", baseUrl],
    queryFn: () => adminApi.getReplyLogicOverview(),
  });

  useEffect(() => {
    if (!overviewQuery.data) {
      return;
    }

    if (!selectedCharacterId && overviewQuery.data.characters[0]) {
      setSelectedCharacterId(overviewQuery.data.characters[0].id);
    }

    if (!selectedConversationId && overviewQuery.data.conversations[0]) {
      setSelectedConversationId(overviewQuery.data.conversations[0].id);
    }
  }, [overviewQuery.data, selectedCharacterId, selectedConversationId]);

  const activeCharacterId =
    selectedCharacterId || overviewQuery.data?.characters[0]?.id || "";
  const activeConversationId =
    selectedConversationId || overviewQuery.data?.conversations[0]?.id || "";

  const characterSnapshotQuery = useQuery({
    queryKey: ["admin-reply-logic-character", baseUrl, activeCharacterId],
    queryFn: () => adminApi.getReplyLogicCharacterSnapshot(activeCharacterId),
    enabled: scope === "character" && Boolean(activeCharacterId),
  });

  const conversationSnapshotQuery = useQuery({
    queryKey: ["admin-reply-logic-conversation", baseUrl, activeConversationId],
    queryFn: () => adminApi.getReplyLogicConversationSnapshot(activeConversationId),
    enabled: scope === "conversation" && Boolean(activeConversationId),
  });

  const overview = overviewQuery.data;
  const selectedCharacter = useMemo(
    () => overview?.characters.find((item) => item.id === activeCharacterId) ?? null,
    [activeCharacterId, overview?.characters],
  );
  const selectedConversation = useMemo(
    () => overview?.conversations.find((item) => item.id === activeConversationId) ?? null,
    [activeConversationId, overview?.conversations],
  );

  async function refreshAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-reply-logic-overview", baseUrl] }),
      queryClient.invalidateQueries({ queryKey: ["admin-reply-logic-character", baseUrl] }),
      queryClient.invalidateQueries({ queryKey: ["admin-reply-logic-conversation", baseUrl] }),
    ]);
  }

  return (
    <div className="space-y-6">
      <AppHeader
        eyebrow="Runtime Reply Control Plane"
        title="AI回复逻辑"
        description="直接查看当前世界里 AI 人的真实回复链路、effective prompt、上下文窗口、记忆和硬编码常量。"
        actions={
          <Button onClick={() => void refreshAll()} variant="secondary" size="lg">
            Refresh Snapshot
          </Button>
        }
      />

      <InlineNotice tone="muted">
        Phase 1 先提供只读总览与快照，不在这个版本里直接保存配置。页面展示的数据来自后端运行时快照，而不是前端自行推断。
      </InlineNotice>

      {overviewQuery.isLoading ? <LoadingBlock label="正在读取回复逻辑总览..." /> : null}
      {overviewQuery.isError && overviewQuery.error instanceof Error ? (
        <ErrorBlock message={overviewQuery.error.message} />
      ) : null}

      {overview ? (
        <>
          <OverviewMetrics overview={overview} />

          <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-6">
              <Card className="bg-[color:var(--surface-console)]">
                <SectionHeading>Inspector Scope</SectionHeading>
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <div className="mb-2 text-xs uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                      Scope
                    </div>
                    <SelectField
                      value={scope}
                      onChange={(event) => setScope(event.target.value as InspectorScope)}
                    >
                      <option value="character">Character</option>
                      <option value="conversation">Conversation</option>
                    </SelectField>
                  </label>

                  {scope === "character" ? (
                    <label className="block">
                      <div className="mb-2 text-xs uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                        Character
                      </div>
                      <SelectField
                        value={activeCharacterId}
                        onChange={(event) => setSelectedCharacterId(event.target.value)}
                      >
                        {(overview.characters ?? []).map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} · {item.currentActivity ?? "unset"}
                          </option>
                        ))}
                      </SelectField>
                    </label>
                  ) : (
                    <label className="block">
                      <div className="mb-2 text-xs uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                        Conversation
                      </div>
                      <SelectField
                        value={activeConversationId}
                        onChange={(event) => setSelectedConversationId(event.target.value)}
                      >
                        {(overview.conversations ?? []).map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.title} · {item.source}
                          </option>
                        ))}
                      </SelectField>
                    </label>
                  )}
                </div>
              </Card>

              <Card className="bg-[color:var(--surface-console)]">
                <SectionHeading>Provider</SectionHeading>
                <div className="mt-4 space-y-3 text-sm text-[color:var(--text-secondary)]">
                  <StaticRow label="Model" value={`${overview.provider.model} (${overview.provider.modelSource})`} />
                  <StaticRow label="Endpoint" value={`${overview.provider.endpoint} (${overview.provider.endpointSource})`} />
                  <StaticRow label="API Key" value={overview.provider.apiKeySource} />
                  <StaticRow label="Configured Provider Model" value={overview.provider.configuredProviderModel ?? "unset"} />
                  <StaticRow label="Configured Provider Endpoint" value={overview.provider.configuredProviderEndpoint ?? "unset"} />
                </div>
                {overview.provider.notes.length ? (
                  <div className="mt-4 space-y-2">
                    {overview.provider.notes.map((note) => (
                      <InlineNotice key={note} tone="warning">
                        {note}
                      </InlineNotice>
                    ))}
                  </div>
                ) : null}
              </Card>

              <Card className="bg-[color:var(--surface-console)]">
                <SectionHeading>Runtime Constants</SectionHeading>
                <SnapshotPanel
                  className="mt-4"
                  title="Hardcoded Runtime Summary"
                  value={overview.constants as unknown as Record<string, unknown>}
                />
              </Card>
            </div>

            <div className="space-y-6">
              {scope === "character" ? (
                <CharacterInspectorPanel
                  selectedCharacter={selectedCharacter}
                  query={characterSnapshotQuery}
                />
              ) : (
                <ConversationInspectorPanel
                  selectedConversation={selectedConversation}
                  query={conversationSnapshotQuery}
                />
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function OverviewMetrics({ overview }: { overview: ReplyLogicOverview }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Characters" value={overview.characters.length} />
      <MetricCard label="Conversations" value={overview.conversations.length} />
      <MetricCard label="Active Model" value={overview.provider.model} />
      <MetricCard label="World Context" value={overview.worldContext?.text || "No snapshot"} />
    </div>
  );
}

function CharacterInspectorPanel({
  selectedCharacter,
  query,
}: {
  selectedCharacter: ReplyLogicOverview["characters"][number] | null;
  query: ReturnType<typeof useQuery<ReplyLogicCharacterSnapshot>>;
}) {
  if (!selectedCharacter) {
    return <PanelEmpty message="当前没有可选角色。" />;
  }

  if (query.isLoading) {
    return <LoadingBlock label="正在读取角色回复快照..." />;
  }

  if (query.isError && query.error instanceof Error) {
    return <ErrorBlock message={query.error.message} />;
  }

  if (!query.data) {
    return <PanelEmpty message="角色回复快照暂不可用。" />;
  }

  return (
    <>
      <Card className="bg-[color:var(--surface-console)]">
        <SectionHeading>Selected Character</SectionHeading>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Name" value={query.data.character.name} />
          <MetricCard label="Relationship" value={query.data.character.relationship} />
          <MetricCard label="Activity" value={query.data.character.currentActivity ?? "unset"} />
          <MetricCard label="Forgetting Curve" value={query.data.actor.forgettingCurve} />
        </div>
      </Card>

      <ActorSnapshotCard actor={query.data.actor} title="Direct Reply Actor Snapshot" />

      <NarrativeCard arcs={query.data.narrativeArc ? [query.data.narrativeArc] : []} />

      <Card className="bg-[color:var(--surface-console)]">
        <SectionHeading>Notes</SectionHeading>
        <NoteList notes={query.data.notes} className="mt-4" />
      </Card>
    </>
  );
}

function ConversationInspectorPanel({
  selectedConversation,
  query,
}: {
  selectedConversation: ReplyLogicOverview["conversations"][number] | null;
  query: ReturnType<typeof useQuery<ReplyLogicConversationSnapshot>>;
}) {
  if (!selectedConversation) {
    return <PanelEmpty message="当前没有可选会话。" />;
  }

  if (query.isLoading) {
    return <LoadingBlock label="正在读取会话回复快照..." />;
  }

  if (query.isError && query.error instanceof Error) {
    return <ErrorBlock message={query.error.message} />;
  }

  if (!query.data) {
    return <PanelEmpty message="会话回复快照暂不可用。" />;
  }

  return (
    <>
      <Card className="bg-[color:var(--surface-console)]">
        <SectionHeading>Conversation Branch</SectionHeading>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Title" value={query.data.conversation.title} />
          <MetricCard label="Type" value={query.data.conversation.type} />
          <MetricCard label="Source" value={query.data.conversation.source} />
          <MetricCard label="Actors" value={query.data.actors.length} />
        </div>
        <div className="mt-4 rounded-[20px] border border-[color:var(--border-faint)] bg-[color:var(--surface-card)] p-4">
          <div className="text-sm font-medium text-[color:var(--text-primary)]">{query.data.branchSummary.title}</div>
          <NoteList notes={query.data.branchSummary.notes} className="mt-3" />
        </div>
      </Card>

      <Card className="bg-[color:var(--surface-console)]">
        <SectionHeading>Visible Conversation History</SectionHeading>
        <HistoryList className="mt-4" items={query.data.visibleMessages} />
      </Card>

      <div className="space-y-6">
        {query.data.actors.map((actor) => (
          <ActorSnapshotCard
            key={`${query.data.conversation.id}-${actor.character.id}`}
            actor={actor}
            title={`${actor.character.name} Snapshot`}
          />
        ))}
      </div>

      <NarrativeCard arcs={query.data.narrativeArcs} />
    </>
  );
}

function ActorSnapshotCard({
  actor,
  title,
}: {
  actor: ReplyLogicActorSnapshot;
  title: string;
}) {
  return (
    <Card className="bg-[color:var(--surface-console)]">
      <SectionHeading>{title}</SectionHeading>

      <div className="mt-4 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <StateGateCard gate={actor.stateGate} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
            <MetricCard label="History Window" value={actor.historyWindow} />
            <MetricCard label="Visible Messages" value={actor.visibleHistoryCount} />
            <MetricCard label="Last Chat At" value={formatDateTime(actor.lastChatAt)} />
            <MetricCard label="World Context" value={actor.worldContextText || "No snapshot"} />
          </div>
          <Card className="bg-[color:var(--surface-card)]">
            <div className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Actor Notes</div>
            <NoteList notes={actor.notes} className="mt-3" />
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="bg-[color:var(--surface-card)]">
            <div className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Prompt Sections</div>
            <PromptSectionList className="mt-4" sections={actor.promptSections} />
          </Card>

          <Card className="bg-[color:var(--surface-card)]">
            <div className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Effective Prompt</div>
            <CodeBlock className="mt-4" value={actor.effectivePrompt} />
          </Card>

          <Card className="bg-[color:var(--surface-card)]">
            <div className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Context Window</div>
            <HistoryList className="mt-4" items={actor.windowMessages} />
          </Card>
        </div>
      </div>
    </Card>
  );
}

function StateGateCard({ gate }: { gate: ReplyLogicStateGateSummary }) {
  return (
    <Card className="bg-[color:var(--surface-card)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-muted)]">State Gate</div>
        <StatusPill tone={toneForGate(gate.mode)}>{gate.mode}</StatusPill>
      </div>
      <div className="mt-3 text-sm leading-7 text-[color:var(--text-secondary)]">{gate.reason}</div>
      {gate.activity ? (
        <div className="mt-3 text-xs text-[color:var(--text-muted)]">activity: {gate.activity}</div>
      ) : null}
      {gate.delayMs ? (
        <div className="mt-2 text-xs text-[color:var(--text-muted)]">
          delay: {gate.delayMs.min}ms - {gate.delayMs.max}ms
        </div>
      ) : null}
      {gate.hintMessages.length ? (
        <ul className="mt-3 space-y-2 text-xs leading-6 text-[color:var(--text-muted)]">
          {gate.hintMessages.map((message) => (
            <li key={message} className="rounded-2xl border border-[color:var(--border-faint)] bg-white/80 px-3 py-2">
              {message}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function PromptSectionList({
  sections,
  className,
}: {
  sections: ReplyLogicPromptSection[];
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="space-y-3">
        {sections.map((section) => (
          <div
            key={section.key}
            className="overflow-hidden rounded-[20px] border border-[color:var(--border-faint)] bg-white/90"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border-faint)] px-4 py-3">
              <div className="text-sm font-medium text-[color:var(--text-primary)]">{section.label}</div>
              <StatusPill tone={section.active ? "healthy" : "muted"}>
                {section.active ? "active" : "inactive"}
              </StatusPill>
            </div>
            <CodeBlock className="rounded-none border-0 bg-transparent p-4" value={section.content || "Section not injected."} />
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryList({
  items,
  className,
}: {
  items: ReplyLogicHistoryItem[];
  className?: string;
}) {
  if (!items.length) {
    return <PanelEmpty message="当前没有可见历史消息。" />;
  }

  return (
    <div className={className}>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-[20px] border border-[color:var(--border-faint)] bg-white/90 p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={item.includedInWindow ? "healthy" : "muted"}>
                {item.includedInWindow ? "in window" : "visible only"}
              </StatusPill>
              <StatusPill tone="muted">{item.senderType}</StatusPill>
              <StatusPill tone="muted">{item.type}</StatusPill>
              {item.attachmentKind ? <StatusPill tone="warning">{item.attachmentKind}</StatusPill> : null}
            </div>
            <div className="mt-3 text-sm font-medium text-[color:var(--text-primary)]">
              {item.senderName} · {formatDateTime(item.createdAt)}
            </div>
            <div className="mt-2 text-sm leading-7 text-[color:var(--text-secondary)]">{item.text}</div>
            <div className="mt-2 text-xs text-[color:var(--text-muted)]">{item.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NarrativeCard({ arcs }: { arcs: ReplyLogicNarrativeArcSummary[] }) {
  return (
    <Card className="bg-[color:var(--surface-console)]">
      <SectionHeading>Memory And Narrative</SectionHeading>
      {!arcs.length ? (
        <PanelEmpty message="当前没有 narrative arc 记录。" />
      ) : (
        <div className="mt-4 space-y-4">
          {arcs.map((arc) => (
            <div
              key={arc.id}
              className="rounded-[20px] border border-[color:var(--border-faint)] bg-[color:var(--surface-card)] p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-medium text-[color:var(--text-primary)]">{arc.title}</div>
                <StatusPill tone={arc.status === "completed" ? "healthy" : "warning"}>{arc.status}</StatusPill>
                <StatusPill tone="muted">{arc.progress}%</StatusPill>
              </div>
              <div className="mt-3 text-xs text-[color:var(--text-muted)]">
                created: {formatDateTime(arc.createdAt)} · completed: {formatDateTime(arc.completedAt)}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {arc.milestones.map((item) => (
                  <StatusPill key={`${arc.id}-${item.label}`} tone="healthy">
                    {item.label}
                  </StatusPill>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function NoteList({
  notes,
  className,
}: {
  notes: string[];
  className?: string;
}) {
  if (!notes.length) {
    return <div className={className} />;
  }

  return (
    <ul className={className ? `${className} space-y-2` : "space-y-2"}>
      {notes.map((note) => (
        <li
          key={note}
          className="rounded-2xl border border-[color:var(--border-faint)] bg-white/80 px-3 py-2 text-sm leading-7 text-[color:var(--text-secondary)]"
        >
          {note}
        </li>
      ))}
    </ul>
  );
}

function StaticRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-[color:var(--border-faint)] bg-[color:var(--surface-card)] px-4 py-3">
      <div className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-muted)]">{label}</div>
      <div className="break-all text-sm leading-7 text-[color:var(--text-primary)]">{value}</div>
    </div>
  );
}

function CodeBlock({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <pre
      className={[
        "overflow-x-auto whitespace-pre-wrap break-words rounded-[20px] border border-[color:var(--border-faint)] bg-white/90 p-4 text-xs leading-6 text-[color:var(--text-secondary)]",
        className ?? "",
      ].join(" ")}
    >
      {value}
    </pre>
  );
}

function toneForGate(mode: ReplyLogicStateGateSummary["mode"]) {
  if (mode === "immediate") {
    return "healthy";
  }

  if (mode === "not_applied") {
    return "muted";
  }

  return "warning";
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "unset";
  }

  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}
