export type PreparedCustomStickerUpload = {
  file: File;
  width: number;
  height: number;
  mimeType: string;
  label?: string;
};

type PrepareCustomStickerUploadInput = {
  file: File;
  label?: string;
};

type PrepareRemoteCustomStickerUploadInput = {
  url: string;
  fileName?: string;
  mimeType?: string;
  label?: string;
};

const MAX_STATIC_STICKER_EDGE = 320;
const MAX_GIF_STICKER_EDGE = 320;
const MAX_GIF_SIZE_BYTES = 2 * 1024 * 1024;
const STATIC_STICKER_QUALITY = 0.88;

export async function prepareCustomStickerUpload(
  input: PrepareCustomStickerUploadInput,
): Promise<PreparedCustomStickerUpload> {
  const normalizedMimeType = normalizeStickerMimeType(
    input.file.type || inferStickerMimeType(input.file.name),
  );
  if (!normalizedMimeType.startsWith("image/")) {
    throw new Error("只能上传图片或动图作为表情。");
  }

  const image = await loadImage(input.file);
  const largestEdge = Math.max(image.naturalWidth, image.naturalHeight);
  const width = Math.max(1, image.naturalWidth);
  const height = Math.max(1, image.naturalHeight);

  if (normalizedMimeType === "image/gif") {
    if (largestEdge > MAX_GIF_STICKER_EDGE) {
      throw new Error(
        `GIF 表情最大边长不能超过 ${MAX_GIF_STICKER_EDGE}px，请先压缩后再试。`,
      );
    }

    if (input.file.size > MAX_GIF_SIZE_BYTES) {
      throw new Error(
        `GIF 表情不能超过 ${formatFileSize(MAX_GIF_SIZE_BYTES)}，请先压缩后再试。`,
      );
    }

    return {
      file: input.file,
      width,
      height,
      mimeType: normalizedMimeType,
      label: normalizeStickerLabel(input.label),
    };
  }

  const scale =
    largestEdge > MAX_STATIC_STICKER_EDGE
      ? MAX_STATIC_STICKER_EDGE / largestEdge
      : 1;
  const nextWidth = Math.max(1, Math.round(width * scale));
  const nextHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = nextWidth;
  canvas.height = nextHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("当前浏览器暂不支持表情压缩。");
  }

  context.clearRect(0, 0, nextWidth, nextHeight);
  context.drawImage(image, 0, 0, nextWidth, nextHeight);

  const blob = await canvasToBlob(canvas);
  const fileName = replaceFileExtension(
    input.file.name || "custom-sticker",
    "webp",
  );

  return {
    file: new File([blob], fileName, {
      type: blob.type,
      lastModified: Date.now(),
    }),
    width: nextWidth,
    height: nextHeight,
    mimeType: blob.type,
    label: normalizeStickerLabel(input.label),
  };
}

export async function prepareRemoteCustomStickerUpload(
  input: PrepareRemoteCustomStickerUploadInput,
): Promise<PreparedCustomStickerUpload> {
  const response = await fetch(input.url);
  if (!response.ok) {
    throw new Error("读取表情资源失败，请稍后再试。");
  }

  const blob = await response.blob();
  const mimeType = normalizeStickerMimeType(
    blob.type || input.mimeType || inferStickerMimeType(input.url),
  );
  const baseName = input.fileName?.trim() || input.label?.trim() || "custom-sticker";
  const fileName = ensureStickerFileName(baseName, mimeType);

  return prepareCustomStickerUpload({
    file: new File([blob], fileName, {
      type: mimeType,
      lastModified: Date.now(),
    }),
    label: input.label,
  });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("读取表情图片失败，请换一张再试。"));
    };

    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("处理表情失败，请换一张再试。"));
          return;
        }

        resolve(blob);
      },
      "image/webp",
      STATIC_STICKER_QUALITY,
    );
  });
}

function replaceFileExtension(fileName: string, nextExtension: string) {
  const normalized = fileName.trim().replace(/\?.*$/, "").replace(/\.[^.]+$/, "");
  return `${normalized || "custom-sticker"}.${nextExtension}`;
}

function ensureStickerFileName(fileName: string, mimeType: string) {
  const normalized = fileName.trim().replace(/\?.*$/, "") || "custom-sticker";
  if (/\.[^.]+$/.test(normalized)) {
    return normalized;
  }

  return `${normalized}${guessStickerExtension(mimeType)}`;
}

function normalizeStickerMimeType(value?: string) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return "image/png";
  }

  if (normalized === "image/jpg") {
    return "image/jpeg";
  }

  return normalized;
}

function guessStickerExtension(mimeType: string) {
  if (mimeType === "image/jpeg") {
    return ".jpg";
  }

  if (mimeType === "image/png") {
    return ".png";
  }

  if (mimeType === "image/webp") {
    return ".webp";
  }

  if (mimeType === "image/gif") {
    return ".gif";
  }

  if (mimeType === "image/svg+xml") {
    return ".svg";
  }

  return ".png";
}

function inferStickerMimeType(url: string) {
  const normalized = url
    .trim()
    .toLowerCase()
    .replace(/[?#].*$/, "");
  if (normalized.endsWith(".gif")) {
    return "image/gif";
  }

  if (normalized.endsWith(".webp")) {
    return "image/webp";
  }

  if (normalized.endsWith(".svg")) {
    return "image/svg+xml";
  }

  if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  return "image/png";
}

function normalizeStickerLabel(value?: string) {
  return value?.trim().replace(/\s+/g, " ").slice(0, 40) || undefined;
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`;
  }

  return `${Math.round(bytes / 1024)}KB`;
}
