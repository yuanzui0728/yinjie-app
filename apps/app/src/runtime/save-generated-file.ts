import { isDesktopRuntimeAvailable } from "@yinjie/ui";

export type SaveGeneratedFileInput = {
  contents: string;
  fileName: string;
  mimeType?: string;
  dialogTitle?: string;
  kindLabel?: string;
};

export type SaveGeneratedFileResult = {
  status: "saved" | "started" | "cancelled" | "failed";
  message: string;
  savedPath?: string;
};

type DesktopGeneratedFileSavePayload = {
  success: boolean;
  cancelled: boolean;
  savedPath?: string | null;
  message: string;
};

function resolveKindLabel(kindLabel: string | undefined) {
  return kindLabel?.trim() || "文件";
}

function normalizeGeneratedFileName(fileName: string) {
  const normalized = fileName.trim();
  return normalized || "download";
}

function saveGeneratedFileWithBrowser(
  input: SaveGeneratedFileInput,
): SaveGeneratedFileResult {
  if (typeof document === "undefined") {
    return {
      status: "failed",
      message: `${resolveKindLabel(input.kindLabel)}保存失败，请稍后再试。`,
    };
  }

  const blob = new Blob([input.contents], {
    type: input.mimeType?.trim() || "application/octet-stream",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = normalizeGeneratedFileName(input.fileName);
  anchor.rel = "noreferrer";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  return {
    status: "started",
    message: `${resolveKindLabel(input.kindLabel)}开始下载。`,
  };
}

export async function saveGeneratedFile(
  input: SaveGeneratedFileInput,
): Promise<SaveGeneratedFileResult> {
  const fileName = normalizeGeneratedFileName(input.fileName);
  if (!isDesktopRuntimeAvailable()) {
    return saveGeneratedFileWithBrowser({
      ...input,
      fileName,
    });
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const result = await invoke<DesktopGeneratedFileSavePayload>(
      "desktop_save_text_file",
      {
        input: {
          contents: input.contents,
          fileName,
          dialogTitle: input.dialogTitle?.trim() || undefined,
        },
      },
    );

    if (result.success) {
      return {
        status: "saved",
        message: result.message,
        savedPath: result.savedPath ?? undefined,
      };
    }

    if (result.cancelled) {
      return {
        status: "cancelled",
        message: result.message || "已取消保存。",
      };
    }

    return {
      status: "failed",
      message:
        result.message ||
        `${resolveKindLabel(input.kindLabel)}保存失败，请稍后再试。`,
    };
  } catch {
    return saveGeneratedFileWithBrowser({
      ...input,
      fileName,
    });
  }
}
