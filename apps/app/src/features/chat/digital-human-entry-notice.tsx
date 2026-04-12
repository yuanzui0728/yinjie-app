import { Button, InlineNotice } from "@yinjie/ui";

export function DigitalHumanEntryNotice({
  tone,
  message,
  onContinue,
  onDismiss,
  onSwitchToVoice,
  continueLabel = "继续视频通话",
  dismissLabel = "先继续聊天",
  voiceLabel = "改用语音通话",
  compact = false,
}: {
  tone: "info" | "warning";
  message: string;
  onContinue: () => void;
  onDismiss?: () => void;
  onSwitchToVoice: () => void;
  continueLabel?: string;
  dismissLabel?: string;
  voiceLabel?: string;
  compact?: boolean;
}) {
  return (
    <InlineNotice
      tone={tone}
      className={
        compact
          ? "rounded-[13px] px-3 py-2 text-[11px] leading-[17px] shadow-none"
          : undefined
      }
    >
      <div className={`flex flex-col ${compact ? "gap-2" : "gap-3"}`}>
        <div className={compact ? "text-[11px] leading-[17px]" : "text-sm leading-6"}>
          {message}
        </div>
        <div className={`flex flex-wrap items-center ${compact ? "gap-1.5" : "gap-2"}`}>
          {onDismiss ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className={compact ? "h-8 rounded-full px-2.5 text-[10px]" : "rounded-full"}
            >
              {dismissLabel}
            </Button>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            onClick={onSwitchToVoice}
            className={compact ? "h-8 rounded-full px-2.5 text-[10px]" : "rounded-full"}
          >
            {voiceLabel}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onContinue}
            className={compact ? "h-8 rounded-full px-2.5 text-[10px]" : "rounded-full"}
          >
            {continueLabel}
          </Button>
        </div>
      </div>
    </InlineNotice>
  );
}
