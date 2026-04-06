import { Capacitor, registerPlugin } from "@capacitor/core";
import { createJSONStorage, type StateStorage } from "zustand/middleware";

const memoryStorage = new Map<string, string>();

type SecureSessionStoragePlugin = {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  remove(options: { key: string }): Promise<void>;
};

const secureSessionStorage = registerPlugin<SecureSessionStoragePlugin>("YinjieSecureStorage");

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isNativeSecureStorageAvailable() {
  return Capacitor.isNativePlatform() && (Capacitor.getPlatform() === "ios" || Capacitor.getPlatform() === "android");
}

async function getSecureItem(name: string) {
  if (!isNativeSecureStorageAvailable()) {
    return null;
  }

  try {
    const result = await secureSessionStorage.get({ key: name });
    return result.value ?? null;
  } catch {
    return null;
  }
}

async function setSecureItem(name: string, value: string) {
  if (!isNativeSecureStorageAvailable()) {
    return false;
  }

  try {
    await secureSessionStorage.set({ key: name, value });
    return true;
  } catch {
    return false;
  }
}

async function removeSecureItem(name: string) {
  if (!isNativeSecureStorageAvailable()) {
    return false;
  }

  try {
    await secureSessionStorage.remove({ key: name });
    return true;
  } catch {
    return false;
  }
}

function createStateStorage(): StateStorage {
  return {
    async getItem(name) {
      const secureValue = await getSecureItem(name);
      if (secureValue !== null) {
        return secureValue;
      }

      const storage = getLocalStorage();
      return storage ? storage.getItem(name) : memoryStorage.get(name) ?? null;
    },
    async setItem(name, value) {
      const storedSecurely = await setSecureItem(name, value);
      if (storedSecurely) {
        return;
      }

      const storage = getLocalStorage();
      if (storage) {
        storage.setItem(name, value);
        return;
      }

      memoryStorage.set(name, value);
    },
    async removeItem(name) {
      const removedSecurely = await removeSecureItem(name);
      if (removedSecurely) {
        return;
      }

      const storage = getLocalStorage();
      if (storage) {
        storage.removeItem(name);
        return;
      }

      memoryStorage.delete(name);
    },
  };
}

export function createSessionStateStorage() {
  return createJSONStorage(() => createStateStorage());
}

export function getSessionStorageMode() {
  return isNativeSecureStorageAvailable() ? "secure-storage" : "web-storage";
}
