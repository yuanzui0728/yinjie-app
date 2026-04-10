export type DesktopNoteRecord = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

const DESKTOP_NOTES_STORAGE_KEY = "yinjie-desktop-notes";
const UNTITLED_NOTE_TITLE = "无标题笔记";

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function buildNoteId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `note-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function normalizeContent(value: string) {
  return value.replace(/\r\n/g, "\n");
}

function buildNotePresentation(content: string) {
  const normalized = normalizeContent(content);
  const trimmedLines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const compactText = normalized.replace(/\s+/g, " ").trim();

  return {
    title: trimmedLines[0]?.slice(0, 28) || UNTITLED_NOTE_TITLE,
    excerpt: compactText
      ? compactText.slice(0, compactText.length > 72 ? 72 : compactText.length)
      : "点击右侧开始记录这条笔记。",
  };
}

function writeDesktopNotes(notes: DesktopNoteRecord[]) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(DESKTOP_NOTES_STORAGE_KEY, JSON.stringify(notes));
}

export function readDesktopNotes() {
  const storage = getStorage();
  if (!storage) {
    return [] as DesktopNoteRecord[];
  }

  const raw = storage.getItem(DESKTOP_NOTES_STORAGE_KEY);
  if (!raw) {
    return [] as DesktopNoteRecord[];
  }

  try {
    const parsed = JSON.parse(raw) as DesktopNoteRecord[];
    if (!Array.isArray(parsed)) {
      return [] as DesktopNoteRecord[];
    }

    return parsed
      .filter(
        (item) =>
          typeof item?.id === "string" &&
          typeof item?.content === "string" &&
          typeof item?.createdAt === "string" &&
          typeof item?.updatedAt === "string",
      )
      .map((item) => {
        const presentation = buildNotePresentation(item.content);
        return {
          ...item,
          title: presentation.title,
          excerpt: presentation.excerpt,
        };
      })
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  } catch {
    return [] as DesktopNoteRecord[];
  }
}

export function createDesktopNote(initialContent = "") {
  const timestamp = new Date().toISOString();
  const presentation = buildNotePresentation(initialContent);
  const note: DesktopNoteRecord = {
    id: buildNoteId(),
    title: presentation.title,
    excerpt: presentation.excerpt,
    content: normalizeContent(initialContent),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const nextNotes = [note, ...readDesktopNotes()];

  writeDesktopNotes(nextNotes);
  return note;
}

export function updateDesktopNote(id: string, content: string) {
  const normalizedContent = normalizeContent(content);
  const presentation = buildNotePresentation(normalizedContent);
  const nextNotes = readDesktopNotes().map((item) =>
    item.id === id
      ? {
          ...item,
          content: normalizedContent,
          title: presentation.title,
          excerpt: presentation.excerpt,
          updatedAt: new Date().toISOString(),
        }
      : item,
  );

  writeDesktopNotes(nextNotes);
  return nextNotes.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function deleteDesktopNote(id: string) {
  const nextNotes = readDesktopNotes().filter((item) => item.id !== id);
  writeDesktopNotes(nextNotes);
  return nextNotes;
}
