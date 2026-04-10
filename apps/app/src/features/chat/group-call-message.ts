import type { DesktopChatCallKind } from "../desktop/chat/desktop-chat-header-actions";

const GROUP_VOICE_CALL_PREFIX = "[群语音通话]";
const GROUP_VIDEO_CALL_PREFIX = "[群视频通话]";

export function buildGroupCallInviteMessage(
  kind: DesktopChatCallKind,
  groupName: string,
) {
  return [
    kind === "voice" ? GROUP_VOICE_CALL_PREFIX : GROUP_VIDEO_CALL_PREFIX,
    groupName.trim() || "当前群聊",
    "已从桌面端打开群通话工作台，可直接在聊天页继续查看成员状态。",
    "如需继续加入或转到手机，请在当前群聊顶部的通话面板里操作。",
  ].join("\n");
}

export function parseGroupCallInviteMessage(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const header = lines[0];
  if (
    header !== GROUP_VOICE_CALL_PREFIX &&
    header !== GROUP_VIDEO_CALL_PREFIX
  ) {
    return null;
  }

  return {
    kind: header === GROUP_VOICE_CALL_PREFIX ? "voice" : "video",
    groupName: lines[1] || "当前群聊",
    summaryLines: lines.slice(2),
  } satisfies {
    kind: DesktopChatCallKind;
    groupName: string;
    summaryLines: string[];
  };
}
