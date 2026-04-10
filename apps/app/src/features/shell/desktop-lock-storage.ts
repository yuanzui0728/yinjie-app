export type DesktopLockSnapshot = {
  passcodeDigest: string | null;
  passcodeLength: number | null;
  isLocked: boolean;
  lockedAt: string | null;
};

const DESKTOP_LOCK_STORAGE_KEY = "yinjie-desktop-lock-state";

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function hashPasscode(passcode: string) {
  let hash = 2166136261;

  for (let index = 0; index < passcode.length; index += 1) {
    hash ^= passcode.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `lock-${(hash >>> 0).toString(16)}`;
}

function writeSnapshot(snapshot: DesktopLockSnapshot) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(DESKTOP_LOCK_STORAGE_KEY, JSON.stringify(snapshot));
}

export function readDesktopLockSnapshot(): DesktopLockSnapshot {
  const storage = getStorage();
  if (!storage) {
    return {
      passcodeDigest: null,
      passcodeLength: null,
      isLocked: false,
      lockedAt: null,
    };
  }

  const raw = storage.getItem(DESKTOP_LOCK_STORAGE_KEY);
  if (!raw) {
    return {
      passcodeDigest: null,
      passcodeLength: null,
      isLocked: false,
      lockedAt: null,
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<DesktopLockSnapshot>;
    return {
      passcodeDigest:
        typeof parsed.passcodeDigest === "string"
          ? parsed.passcodeDigest
          : null,
      passcodeLength:
        typeof parsed.passcodeLength === "number"
          ? parsed.passcodeLength
          : null,
      isLocked: parsed.isLocked === true,
      lockedAt: typeof parsed.lockedAt === "string" ? parsed.lockedAt : null,
    };
  } catch {
    return {
      passcodeDigest: null,
      passcodeLength: null,
      isLocked: false,
      lockedAt: null,
    };
  }
}

export function saveDesktopLockPasscode(passcode: string) {
  const current = readDesktopLockSnapshot();
  const nextSnapshot: DesktopLockSnapshot = {
    ...current,
    passcodeDigest: hashPasscode(passcode),
    passcodeLength: passcode.length,
  };

  writeSnapshot(nextSnapshot);
  return nextSnapshot;
}

export function setDesktopLocked(locked: boolean) {
  const current = readDesktopLockSnapshot();
  const nextSnapshot: DesktopLockSnapshot = {
    ...current,
    isLocked: locked,
    lockedAt: locked ? new Date().toISOString() : current.lockedAt,
  };

  writeSnapshot(nextSnapshot);
  return nextSnapshot;
}

export function clearDesktopLocked() {
  const current = readDesktopLockSnapshot();
  const nextSnapshot: DesktopLockSnapshot = {
    ...current,
    isLocked: false,
  };

  writeSnapshot(nextSnapshot);
  return nextSnapshot;
}

export function verifyDesktopLockPasscode(passcode: string) {
  const current = readDesktopLockSnapshot();
  if (!current.passcodeDigest) {
    return false;
  }

  return current.passcodeDigest === hashPasscode(passcode);
}
