export type MobileMessageReminderOption = {
  id: string;
  label: string;
  detail: string;
  remindAt: string;
};

type MobileMessageReminderSheetProps = {
  open: boolean;
  title?: string;
  previewText?: string;
  options: MobileMessageReminderOption[];
  onClose: () => void;
  onSelect: (option: MobileMessageReminderOption) => void;
};

export function MobileMessageReminderSheet({
  open,
  title = "提醒这条消息",
  previewText,
  options,
  onClose,
  onSelect,
}: MobileMessageReminderSheetProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-[rgba(15,23,42,0.14)]">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="关闭消息提醒面板"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-[20px] border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] pt-2 shadow-[0_-14px_28px_rgba(15,23,42,0.10)]">
        <div className="flex justify-center pb-1.5">
          <div className="h-1 w-10 rounded-full bg-[rgba(148,163,184,0.45)]" />
        </div>
        <div className="px-1 pb-2.5">
          <div className="text-center text-[12px] text-[#8c8c8c]">{title}</div>
          {previewText ? (
            <div className="mt-2 line-clamp-2 rounded-[14px] border border-[color:var(--border-subtle)] bg-white px-3 py-2 text-[12px] leading-5 text-[#4b5563]">
              {previewText}
            </div>
          ) : null}
        </div>
        <div className="overflow-hidden rounded-[14px] border border-[color:var(--border-subtle)] bg-white">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option)}
              className="flex w-full items-center justify-between gap-3 border-b border-[color:var(--border-subtle)] px-4 py-2.5 text-left transition active:bg-[color:var(--surface-card-hover)] last:border-b-0"
            >
              <div className="min-w-0">
                <div className="text-[15px] text-[#111827]">{option.label}</div>
                <div className="mt-0.5 text-[11px] text-[#8c8c8c]">
                  {option.detail}
                </div>
              </div>
              <div className="shrink-0 text-[11px] text-[#07c160]">
                设为提醒
              </div>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-2.5 flex h-11 w-full items-center justify-center rounded-[14px] border border-[color:var(--border-subtle)] bg-white text-[15px] font-medium text-[#111827] transition active:bg-[color:var(--surface-card-hover)]"
        >
          取消
        </button>
      </div>
    </div>
  );
}
