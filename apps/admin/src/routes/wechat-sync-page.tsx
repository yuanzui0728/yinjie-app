import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type {
  WechatSyncContactBundle,
  WechatSyncImportResponse,
  WechatSyncPreviewItem,
} from "@yinjie/contracts";
import {
  Button,
  Card,
  ErrorBlock,
  LoadingBlock,
  StatusPill,
} from "@yinjie/ui";
import {
  AdminActionFeedback,
  AdminCallout,
  AdminEmptyState,
  AdminMiniPanel,
  AdminPageHero,
  AdminSectionHeader,
  AdminSelectableCard,
  AdminTextArea,
  AdminTextField,
  AdminToggle,
} from "../components/admin-workbench";
import { adminApi } from "../lib/admin-api";
import {
  buildWechatConnectorContactBundles,
  getWechatConnectorHealth,
  listWechatConnectorContacts,
  loadWechatConnectorSettings,
  saveWechatConnectorSettings,
  scanWechatConnector,
  type WechatConnectorSettings,
} from "../lib/wechat-local-connector";
import { resolveAdminCoreApiBaseUrl } from "../lib/core-api-base";

export function WechatSyncPage() {
  const baseUrl = resolveAdminCoreApiBaseUrl();
  const queryClient = useQueryClient();
  const [connectorSettings, setConnectorSettings] = useState<WechatConnectorSettings>(
    () => loadWechatConnectorSettings(),
  );
  const [search, setSearch] = useState("");
  const [includeGroups, setIncludeGroups] = useState(false);
  const [autoAddFriend, setAutoAddFriend] = useState(true);
  const [seedMoments, setSeedMoments] = useState(true);
  const [manualBundleJson, setManualBundleJson] = useState("");
  const [manualBundleError, setManualBundleError] = useState<string | null>(null);
  const [selectedUsernames, setSelectedUsernames] = useState<string[]>([]);
  const [previewItems, setPreviewItems] = useState<WechatSyncPreviewItem[]>([]);
  const deferredSearch = useDeferredValue(search.trim());

  const connectorHealthQuery = useQuery({
    queryKey: ["wechat-connector-health", connectorSettings.baseUrl],
    queryFn: () => getWechatConnectorHealth(connectorSettings.baseUrl),
    retry: false,
    refetchInterval: 10_000,
  });

  const contactsQuery = useQuery({
    queryKey: [
      "wechat-connector-contacts",
      connectorSettings.baseUrl,
      deferredSearch,
      includeGroups,
    ],
    queryFn: () =>
      listWechatConnectorContacts(connectorSettings.baseUrl, {
        query: deferredSearch,
        includeGroups,
        limit: 200,
      }),
    enabled: connectorHealthQuery.isSuccess,
    retry: false,
  });

  const connectorReady = connectorHealthQuery.isSuccess && connectorHealthQuery.data.ok;
  const selectedSet = useMemo(
    () => new Set(selectedUsernames),
    [selectedUsernames],
  );
  const selectedCount = selectedUsernames.length;

  const scanMutation = useMutation({
    mutationFn: () => scanWechatConnector(connectorSettings.baseUrl),
    onSuccess: async () => {
      saveWechatConnectorSettings(connectorSettings);
      setPreviewItems([]);
      setSelectedUsernames([]);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["wechat-connector-health", connectorSettings.baseUrl],
        }),
        queryClient.invalidateQueries({
          queryKey: ["wechat-connector-contacts", connectorSettings.baseUrl],
        }),
      ]);
    },
  });

  const previewMutation = useMutation({
    mutationFn: async (contacts?: WechatSyncContactBundle[]) => {
      const selectedContacts =
        contacts && contacts.length > 0
          ? contacts
          : await loadSelectedConnectorContacts(
              connectorSettings.baseUrl,
              selectedUsernames,
            );
      saveWechatConnectorSettings(connectorSettings);
      return adminApi.previewWechatSync({ contacts: selectedContacts });
    },
    onSuccess: (result) => {
      setPreviewItems(result.items);
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!previewItems.length) {
        throw new Error("请先生成角色预览。");
      }
      return adminApi.importWechatSync({
        items: previewItems.map((item) => ({
          contact: item.contact,
          draftCharacter: item.draftCharacter,
          autoAddFriend,
          seedMoments,
        })),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-characters-crud", baseUrl],
        }),
        queryClient.invalidateQueries({
          queryKey: ["admin-characters", baseUrl],
        }),
        queryClient.invalidateQueries({
          queryKey: ["admin-character-friend-ids", baseUrl],
        }),
        queryClient.invalidateQueries({
          queryKey: ["admin-system-status", baseUrl],
        }),
      ]);
    },
  });

  function toggleUsername(username: string) {
    setPreviewItems([]);
    setSelectedUsernames((current) =>
      current.includes(username)
        ? current.filter((item) => item !== username)
        : [...current, username],
    );
  }

  function selectVisibleContacts() {
    setPreviewItems([]);
    setSelectedUsernames((contactsQuery.data ?? [])
      .filter((item) => !item.isGroup)
      .map((item) => item.username));
  }

  function clearSelection() {
    setPreviewItems([]);
    setSelectedUsernames([]);
  }

  return (
    <div className="space-y-6">
      <AdminPageHero
        eyebrow="角色中心 / 微信同步"
        title="一键同步微信朋友"
        description="通过你本地授权提供的联系人资料和聊天摘要，挑选要导入的微信联系人，生成隐界角色并自动成为好友。第一版会优先使用聊天、标签和联系人资料；朋友圈摘要目前只在数据源提供时参与导入。"
        actions={
          <>
            <Link to="/characters">
              <Button variant="secondary" size="lg">
                返回角色中心
              </Button>
            </Link>
            <Button
              variant="primary"
              size="lg"
              onClick={() => previewMutation.mutate(undefined)}
              disabled={!connectorReady || !selectedCount || previewMutation.isPending}
            >
              {previewMutation.isPending ? "生成预览中..." : "生成角色预览"}
            </Button>
          </>
        }
        metrics={[
          {
            label: "连接器状态",
            value: connectorReady ? "已连接" : "未连接",
          },
          {
            label: "已选联系人",
            value: selectedCount,
          },
          {
            label: "最近扫描联系人",
            value: connectorHealthQuery.data?.contactCount ?? 0,
          },
          {
            label: "已生成预览",
            value: previewItems.length,
          },
        ]}
      />

      <AdminCallout
        title="本地运行前提"
        tone="info"
        description={
          <div className="space-y-2">
            <p>后台只消费你本地已经授权整理好的联系人资料和聊天摘要，不提供密钥提取、聊天记录破解或进程内存读取能力。</p>
            <p>如果你已经有自己的本地数据连接器，可直接填入连接器地址；如果没有，也可以把联系人快照 JSON 直接粘贴到下方手动导入区。</p>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="bg-[color:var(--surface-console)]">
          <AdminSectionHeader
            title="连接器设置"
            actions={
              <StatusPill tone={connectorReady ? "healthy" : "warning"}>
                {connectorReady ? "已连接" : "待启动"}
              </StatusPill>
            }
          />
          <div className="mt-4 grid gap-4">
            <AdminTextField
              label="连接器地址"
              value={connectorSettings.baseUrl}
              placeholder="http://127.0.0.1:17364"
              onChange={(value) =>
                setConnectorSettings((current) => ({ ...current, baseUrl: value }))
              }
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              variant="primary"
              onClick={() => scanMutation.mutate()}
              disabled={scanMutation.isPending}
            >
              {scanMutation.isPending ? "刷新中..." : "刷新本地索引"}
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                queryClient.invalidateQueries({
                  queryKey: ["wechat-connector-health", connectorSettings.baseUrl],
                })
              }
            >
              刷新连接状态
            </Button>
          </div>

          {connectorHealthQuery.isLoading ? (
            <LoadingBlock className="mt-4" label="正在探测本地微信连接器..." />
          ) : null}
          {connectorHealthQuery.isError && connectorHealthQuery.error instanceof Error ? (
            <ErrorBlock className="mt-4" message={connectorHealthQuery.error.message} />
          ) : null}
          {scanMutation.isError && scanMutation.error instanceof Error ? (
            <ErrorBlock className="mt-4" message={scanMutation.error.message} />
          ) : null}
          {scanMutation.isSuccess ? (
            <AdminActionFeedback
              className="mt-4"
              tone="success"
              title="本地索引已刷新"
              description={scanMutation.data.message}
            />
          ) : null}

          {connectorReady ? (
            <div className="mt-4 grid gap-3">
              <AdminMiniPanel title="当前配置">
                <div className="space-y-2 text-sm text-[color:var(--text-secondary)]">
                  <div>连接器：{connectorSettings.baseUrl}</div>
                  <div>连接器标识：{connectorHealthQuery.data.activeConfig.connectorLabel || "未回报"}</div>
                  <div>数据摘要：{connectorHealthQuery.data.activeConfig.sourceSummary || "未回报"}</div>
                  <div>上次扫描：{formatDateTime(connectorHealthQuery.data.lastScanAt)}</div>
                </div>
              </AdminMiniPanel>
              <AdminMiniPanel title="导入选项">
                <div className="space-y-3">
                  <AdminToggle
                    label="导入后自动成为好友"
                    checked={autoAddFriend}
                    onChange={setAutoAddFriend}
                  />
                  <AdminToggle
                    label="如果带有朋友圈摘要则自动生成角色朋友圈"
                    checked={seedMoments}
                    onChange={setSeedMoments}
                  />
                </div>
              </AdminMiniPanel>
            </div>
          ) : null}
        </Card>

        <Card className="bg-[color:var(--surface-console)]">
          <AdminSectionHeader
            title="手动导入联系人快照"
            actions={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  try {
                    const bundles = parseWechatSyncContactBundles(manualBundleJson);
                    setManualBundleError(null);
                    setPreviewItems([]);
                    setSelectedUsernames(bundles.map((item) => item.username));
                    previewMutation.mutate(bundles);
                  } catch (error) {
                    setManualBundleError(
                      error instanceof Error ? error.message : "联系人快照解析失败。",
                    );
                  }
                }}
                disabled={previewMutation.isPending}
              >
                载入 JSON 并生成预览
              </Button>
            }
          />
          <div className="mt-4">
            <AdminTextArea
              label="联系人快照 JSON"
              value={manualBundleJson}
              onChange={setManualBundleJson}
              textareaClassName="min-h-52 font-mono text-xs"
              description="粘贴 `WechatSyncContactBundle[]` 数组即可直接生成预览。只适用于你本人合法导出的联系人资料和聊天摘要。"
              placeholder='[{"username":"wxid_alice","displayName":"Alice","tags":["同事"],"isGroup":false,"messageCount":128,"ownerMessageCount":62,"contactMessageCount":66,"latestMessageAt":"2026-04-16T11:20:00.000Z","chatSummary":"经常聊产品迭代、周末约饭和出差安排。","topicKeywords":["产品","出差","周末"],"sampleMessages":[{"timestamp":"2026-04-16 19:20","text":"周五一起吃饭？","sender":"Alice","direction":"contact"}],"momentHighlights":[]}]'
            />
          </div>

          {manualBundleError ? (
            <ErrorBlock className="mt-4" message={manualBundleError} />
          ) : null}
          {previewMutation.isError && previewMutation.error instanceof Error ? (
            <ErrorBlock className="mt-4" message={previewMutation.error.message} />
          ) : null}
        </Card>

        <Card className="bg-[color:var(--surface-console)] xl:col-span-2">
          <AdminSectionHeader
            title="联系人选择"
            actions={
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={selectVisibleContacts}
                  disabled={!contactsQuery.data?.length}
                >
                  全选可见联系人
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={clearSelection}
                  disabled={!selectedCount}
                >
                  清空选择
                </Button>
              </div>
            }
          />
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="min-w-[240px] flex-1">
              <AdminTextField
                label="搜索联系人"
                value={search}
                placeholder="搜索备注名、昵称、标签"
                onChange={setSearch}
              />
            </div>
            <div className="pt-6">
              <AdminToggle
                label="包含群聊"
                checked={includeGroups}
                onChange={(checked) => {
                  setPreviewItems([]);
                  setIncludeGroups(checked);
                }}
              />
            </div>
          </div>

          {contactsQuery.isLoading ? (
            <LoadingBlock className="mt-4" label="正在读取本地微信联系人..." />
          ) : null}
          {contactsQuery.isError && contactsQuery.error instanceof Error ? (
            <ErrorBlock className="mt-4" message={contactsQuery.error.message} />
          ) : null}

          {!contactsQuery.isLoading && connectorReady && !(contactsQuery.data?.length ?? 0) ? (
            <AdminEmptyState
              className="mt-4"
              title="当前没有可选择的联系人"
              description="先刷新一次本地索引；如果已经刷新过，检查搜索词或确认连接器是否提供了联系人列表。"
            />
          ) : null}

          <div className="mt-4 space-y-3">
            {(contactsQuery.data ?? []).map((contact) => (
              <AdminSelectableCard
                key={contact.username}
                active={selectedSet.has(contact.username)}
                onClick={() => toggleUsername(contact.username)}
                title={contact.displayName}
                subtitle={contact.remarkName || contact.nickname || contact.username}
                badge={
                  <StatusPill tone={contact.isGroup ? "warning" : "healthy"}>
                    {contact.isGroup ? "群聊" : "联系人"}
                  </StatusPill>
                }
                meta={
                  <div className="space-y-1">
                    <div>
                      消息 {contact.messageCount} 条
                      {contact.latestMessageAt ? ` · 最近 ${formatDateTime(contact.latestMessageAt)}` : ""}
                    </div>
                    <div>
                      {contact.tags.length ? `标签：${contact.tags.join("、")}` : "暂无标签"}
                    </div>
                    {contact.sampleSnippet ? <div>样本：{contact.sampleSnippet}</div> : null}
                  </div>
                }
                activeLabel="已加入导入队列"
              />
            ))}
          </div>
        </Card>
      </div>

      <Card className="bg-[color:var(--surface-console)]">
        <AdminSectionHeader
          title="角色预览"
          actions={
            <Button
              variant="primary"
              size="sm"
              onClick={() => importMutation.mutate()}
              disabled={!previewItems.length || importMutation.isPending}
            >
              {importMutation.isPending ? "导入中..." : "导入并建立好友关系"}
            </Button>
          }
        />

        {previewMutation.isError && previewMutation.error instanceof Error ? (
          <ErrorBlock className="mt-4" message={previewMutation.error.message} />
        ) : null}
        {importMutation.isError && importMutation.error instanceof Error ? (
          <ErrorBlock className="mt-4" message={importMutation.error.message} />
        ) : null}
        {importMutation.isSuccess ? (
          <ImportResultPanel result={importMutation.data} />
        ) : null}

        {!previewItems.length && !previewMutation.isPending ? (
          <AdminEmptyState
            className="mt-4"
            title="还没有生成导入预览"
            description="先在上方选择微信联系人，再点击“生成角色预览”。"
          />
        ) : null}
        {previewMutation.isPending ? (
          <LoadingBlock className="mt-4" label="正在根据微信聊天资料生成角色预览..." />
        ) : null}

        {previewItems.length ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {previewItems.map((item) => (
              <Card key={item.contact.username} className="bg-[color:var(--surface-card)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-[color:var(--text-primary)]">
                      {item.draftCharacter.name || item.contact.displayName}
                    </div>
                    <div className="mt-1 text-sm text-[color:var(--text-secondary)]">
                      来源联系人：{item.contact.displayName}
                    </div>
                  </div>
                  <StatusPill tone={item.confidence === "high" ? "healthy" : item.confidence === "medium" ? "warning" : "muted"}>
                    {item.confidence === "high"
                      ? "高置信"
                      : item.confidence === "medium"
                        ? "中置信"
                        : "低置信"}
                  </StatusPill>
                </div>

                <div className="mt-4 space-y-2 text-sm text-[color:var(--text-secondary)]">
                  <div>关系：{item.draftCharacter.relationship || "未生成"}</div>
                  <div>简介：{item.draftCharacter.bio || "未生成"}</div>
                  <div>
                    领域：
                    {(item.draftCharacter.expertDomains?.length
                      ? item.draftCharacter.expertDomains
                      : ["general"]
                    ).join("、")}
                  </div>
                  <div>
                    记忆摘要：
                    {item.draftCharacter.profile?.memorySummary || "未生成"}
                  </div>
                </div>

                {item.warnings.length ? (
                  <div className="mt-4 space-y-2">
                    {item.warnings.map((warning) => (
                      <div
                        key={warning}
                        className="rounded-2xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-[color:var(--text-secondary)]"
                      >
                        {warning}
                      </div>
                    ))}
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function ImportResultPanel({ result }: { result: WechatSyncImportResponse }) {
  return (
    <div className="mt-4 space-y-4">
      <AdminActionFeedback
        tone="success"
        title="导入完成"
        description={`本轮共导入 ${result.importedCount} 个角色。`}
      />

      {result.items.length ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {result.items.map((item) => (
            <Card key={item.contactUsername} className="bg-[color:var(--surface-card)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-[color:var(--text-primary)]">
                    {item.character.name}
                  </div>
                  <div className="mt-1 text-sm text-[color:var(--text-secondary)]">
                    {item.displayName} · {item.status === "created" ? "新建角色" : "更新现有角色"}
                  </div>
                </div>
                <StatusPill tone="healthy">
                  {item.friendshipCreated ? "已建立好友" : "好友已存在"}
                </StatusPill>
              </div>
              <div className="mt-3 text-sm text-[color:var(--text-secondary)]">
                已生成朋友圈种子：{item.seededMomentCount} 条
              </div>
              <div className="mt-4">
                <Link
                  to="/characters/$characterId"
                  params={{ characterId: item.character.id }}
                >
                  <Button variant="secondary" size="sm">
                    打开角色工作区
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {result.skipped.length ? (
        <Card className="bg-[color:var(--surface-card)]">
          <div className="text-sm font-semibold text-[color:var(--text-primary)]">
            跳过项
          </div>
          <div className="mt-3 space-y-2">
            {result.skipped.map((item) => (
              <div
                key={`${item.contactUsername}-${item.reason}`}
                className="rounded-2xl border border-[color:var(--border-faint)] bg-[color:var(--surface-soft)] px-3 py-2 text-sm text-[color:var(--text-secondary)]"
              >
                {item.displayName || item.contactUsername}：{item.reason}
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "暂无";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function loadSelectedConnectorContacts(
  baseUrl: string,
  usernames: string[],
) {
  if (!usernames.length) {
    throw new Error("请先至少选择一个联系人。");
  }
  return buildWechatConnectorContactBundles(baseUrl, usernames);
}

function parseWechatSyncContactBundles(value: string): WechatSyncContactBundle[] {
  const raw = value.trim();
  if (!raw) {
    throw new Error("请先粘贴联系人快照 JSON。");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("联系人快照不是合法 JSON。");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("联系人快照必须是 JSON 数组。");
  }

  const contacts = parsed.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`第 ${index + 1} 个联系人不是对象。`);
    }
    const username = readString(entry.username);
    const displayName =
      readString(entry.displayName) ||
      readString(entry.remarkName) ||
      readString(entry.nickname);
    if (!username) {
      throw new Error(`第 ${index + 1} 个联系人缺少 username。`);
    }
    if (!displayName) {
      throw new Error(`第 ${index + 1} 个联系人缺少 displayName。`);
    }

    return {
      username,
      displayName,
      nickname: readNullableString(entry.nickname),
      remarkName: readNullableString(entry.remarkName),
      region: readNullableString(entry.region),
      source: readNullableString(entry.source),
      tags: readStringArray(entry.tags),
      isGroup: entry.isGroup === true,
      messageCount: readNumber(entry.messageCount),
      ownerMessageCount: readNumber(entry.ownerMessageCount),
      contactMessageCount: readNumber(entry.contactMessageCount),
      latestMessageAt: readNullableString(entry.latestMessageAt),
      chatSummary: readNullableString(entry.chatSummary),
      topicKeywords: readStringArray(entry.topicKeywords),
      sampleMessages: readMessageSamples(entry.sampleMessages),
      momentHighlights: readMomentHighlights(entry.momentHighlights),
    } satisfies WechatSyncContactBundle;
  });

  if (!contacts.length) {
    throw new Error("联系人快照为空，无法生成预览。");
  }

  return contacts;
}

function readMessageSamples(value: unknown): WechatSyncContactBundle["sampleMessages"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }
      const text = readString(entry.text);
      if (!text) {
        return null;
      }
      return {
        timestamp: readString(entry.timestamp),
        text,
        sender: readNullableString(entry.sender),
        typeLabel: readNullableString(entry.typeLabel),
        direction: normalizeMessageDirection(entry.direction),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry != null);
}

function readMomentHighlights(
  value: unknown,
): WechatSyncContactBundle["momentHighlights"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }
      const text = readString(entry.text);
      if (!text) {
        return null;
      }
      return {
        postedAt: readNullableString(entry.postedAt),
        text,
        location: readNullableString(entry.location),
        mediaHint: readNullableString(entry.mediaHint),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry != null);
}

function normalizeMessageDirection(
  value: unknown,
): WechatSyncContactBundle["sampleMessages"][number]["direction"] {
  switch (value) {
    case "owner":
    case "contact":
    case "group_member":
    case "system":
    case "unknown":
      return value;
    default:
      return "unknown";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readNullableString(value: unknown) {
  const normalized = readString(value);
  return normalized || null;
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => readString(entry))
    .filter(Boolean);
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
