import { useEffect, useState } from "react";
import {
  getChatReminderActionErrorMessage,
  getChatReminderActionNotice,
  type ChatReminderEntry,
} from "./chat-reminder-entries";
import { removeLocalChatMessageReminder } from "./local-chat-message-actions";

export const CHAT_REMINDER_ACTION_NOTICE_DURATION_MS = 2_400;

type UseChatReminderActionsOptions = {
  navigateToReminder: (entry: ChatReminderEntry) => void;
  onNoticeChange?: (notice: string | null) => void;
  autoClearLocalNoticeMs?: number | null;
  onCompleteReminder?: (messageId: string) => Promise<void> | void;
};

export function useChatReminderActions({
  navigateToReminder,
  onNoticeChange,
  autoClearLocalNoticeMs = null,
  onCompleteReminder,
}: UseChatReminderActionsOptions) {
  const [localNotice, setLocalNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!localNotice || !autoClearLocalNoticeMs) {
      return;
    }

    const timer = window.setTimeout(
      () => setLocalNotice(null),
      autoClearLocalNoticeMs,
    );
    return () => window.clearTimeout(timer);
  }, [autoClearLocalNoticeMs, localNotice]);

  function openReminder(entry: ChatReminderEntry) {
    onNoticeChange?.(null);
    setLocalNotice(null);
    navigateToReminder(entry);
  }

  async function completeReminder(entry: ChatReminderEntry) {
    const noticeMessage = getChatReminderActionNotice(entry);

    try {
      await (onCompleteReminder?.(entry.messageId) ??
        Promise.resolve(removeLocalChatMessageReminder(entry.messageId)));
      onNoticeChange?.(noticeMessage);
      setLocalNotice(noticeMessage);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : getChatReminderActionErrorMessage(entry);
      onNoticeChange?.(message);
      setLocalNotice(message);
    }
  }

  function clearLocalNotice() {
    setLocalNotice(null);
  }

  return {
    localNotice,
    clearLocalNotice,
    openReminder,
    completeReminder,
  };
}
