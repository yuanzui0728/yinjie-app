import { Button } from "@yinjie/ui";

type MobileChatAttachmentPreviewProps = {
  fileName: string;
  previewUrl: string;
  pending?: boolean;
  onCancel: () => void;
  onSend: () => void | Promise<void>;
};

export function MobileChatAttachmentPreview({
  fileName,
  previewUrl,
  pending = false,
  onCancel,
  onSend,
}: MobileChatAttachmentPreviewProps) {
  return (
    <div className="mb-2 rounded-[22px] border border-white/80 bg-white/92 p-3 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-3">
        <img
          src={previewUrl}
          alt={fileName}
          className="h-16 w-16 rounded-[18px] border border-white/75 bg-[color:var(--surface-soft)] object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-[color:var(--text-primary)]">
            {fileName}
          </div>
          <div className="mt-1 text-xs text-[color:var(--text-muted)]">
            发送前确认一下图片内容。
          </div>
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={pending}
        >
          取消
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={() => void onSend()}
          disabled={pending}
        >
          {pending ? "发送中..." : "发送图片"}
        </Button>
      </div>
    </div>
  );
}
