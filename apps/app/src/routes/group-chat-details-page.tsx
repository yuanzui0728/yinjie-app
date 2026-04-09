import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { getGroup, getGroupMembers } from "@yinjie/contracts";
import { ErrorBlock, InlineNotice, LoadingBlock } from "@yinjie/ui";
import { EmptyState } from "../components/empty-state";
import { ChatDetailsShell } from "../features/chat-details/chat-details-shell";
import { ChatMemberGrid } from "../features/chat-details/chat-member-grid";
import {
  readGroupChatDetailPreferences,
  writeGroupChatDetailPreferences,
} from "../features/chat-details/chat-detail-preferences";
import { ChatSettingRow } from "../features/chat-details/chat-setting-row";
import { useAppRuntimeConfig } from "../runtime/runtime-config-store";

export function GroupChatDetailsPage() {
  const { groupId } = useParams({ from: "/group/$groupId/details" });
  const navigate = useNavigate();
  const runtimeConfig = useAppRuntimeConfig();
  const baseUrl = runtimeConfig.apiBaseUrl;
  const [notice, setNotice] = useState<string | null>(null);
  const [preferences, setPreferences] = useState(() =>
    readGroupChatDetailPreferences(groupId),
  );

  useEffect(() => {
    setPreferences(readGroupChatDetailPreferences(groupId));
    setNotice(null);
  }, [groupId]);

  useEffect(() => {
    writeGroupChatDetailPreferences(groupId, preferences);
  }, [groupId, preferences]);

  const groupQuery = useQuery({
    queryKey: ["app-group", baseUrl, groupId],
    queryFn: () => getGroup(groupId, baseUrl),
  });

  const membersQuery = useQuery({
    queryKey: ["app-group-members", baseUrl, groupId],
    queryFn: () => getGroupMembers(groupId, baseUrl),
  });

  const memberItems = useMemo(() => {
    const members = (membersQuery.data ?? []).slice(0, 10).map((member) => ({
      key: member.id,
      label: member.memberName ?? member.memberId,
      src: member.memberAvatar,
    }));

    return [
      ...members,
      {
        key: "add",
        label: "添加",
        kind: "add" as const,
        onClick: () => {
          setNotice("群成员添加能力需要后端补接口，当前先保留微信式入口。");
        },
      },
      {
        key: "remove",
        label: "移除",
        kind: "remove" as const,
        onClick: () => {
          setNotice("群成员移除能力需要后端补接口，当前先保留微信式入口。");
        },
      },
    ];
  }, [membersQuery.data]);

  return (
    <ChatDetailsShell
      title={groupQuery.data?.name ?? "群聊信息"}
      subtitle={
        membersQuery.data
          ? `${membersQuery.data.length} 人群聊`
          : "群聊信息"
      }
      onBack={() => {
        void navigate({ to: "/group/$groupId", params: { groupId } });
      }}
    >
      {groupQuery.isLoading || membersQuery.isLoading ? (
        <LoadingBlock label="正在读取群聊信息..." />
      ) : null}
      {groupQuery.isError && groupQuery.error instanceof Error ? (
        <div className="px-3">
          <ErrorBlock message={groupQuery.error.message} />
        </div>
      ) : null}
      {membersQuery.isError && membersQuery.error instanceof Error ? (
        <div className="px-3">
          <ErrorBlock message={membersQuery.error.message} />
        </div>
      ) : null}
      {notice ? (
        <div className="px-3">
          <InlineNotice tone="info">{notice}</InlineNotice>
        </div>
      ) : null}

      {!groupQuery.isLoading && !groupQuery.data ? (
        <div className="px-3">
          <EmptyState title="群聊不存在" description="这个群聊暂时不可用，返回消息列表再试一次。" />
        </div>
      ) : null}

      {groupQuery.data ? (
        <>
          <ChatMemberGrid items={memberItems} />

          <section className="border-y border-black/5 bg-white">
            <div className="divide-y divide-black/5">
              <ChatSettingRow
                label="群聊名称"
                value={groupQuery.data.name}
                onClick={() => {
                  setNotice("修改群聊名称需要后端补接口，当前先只读展示。");
                }}
              />
              <ChatSettingRow
                label="群公告"
                value="暂无"
                onClick={() => {
                  setNotice("群公告能力需要后端补接口，当前先保留入口。");
                }}
              />
            </div>
          </section>

          <section className="border-y border-black/5 bg-white">
            <div className="divide-y divide-black/5">
              <ChatSettingRow
                label="查找聊天记录"
                onClick={() => {
                  void navigate({
                    to: "/group/$groupId/search",
                    params: { groupId },
                  });
                }}
              />
            </div>
          </section>

          <section className="border-y border-black/5 bg-white">
            <div className="divide-y divide-black/5">
              <ChatSettingRow
                label="消息免打扰"
                checked={preferences.muted}
                onToggle={(checked) => {
                  setPreferences((current) => ({ ...current, muted: checked }));
                  setNotice(checked ? "已开启群消息免打扰。" : "已关闭群消息免打扰。");
                }}
              />
              <ChatSettingRow
                label="置顶聊天"
                value="待接入"
                onClick={() => {
                  setNotice("群聊置顶当前还没有后端能力，后续会接入真实状态。");
                }}
              />
              <ChatSettingRow
                label="保存到通讯录"
                value="待接入"
                onClick={() => {
                  setNotice("群聊保存到通讯录能力当前未接入，先保留微信式入口。");
                }}
              />
            </div>
          </section>

          <section className="border-y border-black/5 bg-white">
            <div className="divide-y divide-black/5">
              <ChatSettingRow
                label="我在本群的昵称"
                value="待接入"
                onClick={() => {
                  setNotice("群内昵称编辑需要后端补接口，当前先保留入口。");
                }}
              />
              <ChatSettingRow
                label="显示群成员昵称"
                checked={preferences.showMemberNicknames}
                onToggle={(checked) => {
                  setPreferences((current) => ({
                    ...current,
                    showMemberNicknames: checked,
                  }));
                  setNotice(checked ? "已开启显示群成员昵称。" : "已关闭显示群成员昵称。");
                }}
              />
            </div>
          </section>

          <section className="border-y border-black/5 bg-white">
            <div className="divide-y divide-black/5">
              <ChatSettingRow
                label="设置当前聊天背景"
                value={preferences.backgroundLabel}
                onClick={() => {
                  setNotice("聊天背景入口已预留，首版先保留默认背景。");
                }}
              />
            </div>
          </section>

          <section className="border-y border-black/5 bg-white">
            <div className="divide-y divide-black/5">
              <ChatSettingRow
                label="清空聊天记录"
                danger
                onClick={() => {
                  setNotice("群聊清空聊天记录需要后端补接口，当前先保留危险操作区。");
                }}
              />
              <ChatSettingRow
                label="删除并退出"
                danger
                onClick={() => {
                  setNotice("退出群聊需要后端补接口，当前先保留危险操作区。");
                }}
              />
            </div>
          </section>
        </>
      ) : null}
    </ChatDetailsShell>
  );
}
