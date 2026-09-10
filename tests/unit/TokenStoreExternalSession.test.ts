import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import { setToken, subscribeToExternalTokenChanges } from "@/auth/tokenStore";

const KEY = "auth_token_v1";

describe("cross-tab session changes", () => {
  const originalPlatform = Platform.OS;
  const descriptors = new Map<string, PropertyDescriptor | undefined>();
  let values: Map<string, string>;
  let browserListeners: Map<string, Set<(event?: any) => void>>;
  let documentListeners: Map<string, Set<(event?: any) => void>>;
  let storage: Storage;
  let onChange: jest.Mock;
  let unsubscribe: () => void;

  function emit(type: string, event?: any) {
    for (const listener of browserListeners.get(type) || []) listener(event);
  }

  function writeFromOtherTab(token: string | null, key: string | null = KEY) {
    if (token === null) values.delete(KEY);
    else values.set(KEY, token);
    emit("storage", { key, storageArea: storage, newValue: token });
  }

  beforeEach(() => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
    values = new Map([[KEY, "owner-token"]]);
    browserListeners = new Map();
    documentListeners = new Map();
    storage = {
      getItem: jest.fn((key: string) => values.get(key) ?? null),
      setItem: jest.fn((key: string, value: string) => values.set(key, value)),
      removeItem: jest.fn((key: string) => values.delete(key))
    } as unknown as Storage;
    const events = (listeners: Map<string, Set<(event?: any) => void>>) => ({
      addEventListener: (type: string, listener: (event?: any) => void) => {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(listener);
      },
      removeEventListener: (type: string, listener: (event?: any) => void) => {
        listeners.get(type)?.delete(listener);
      }
    });
    const replacements = {
      localStorage: storage,
      document: { visibilityState: "visible", ...events(documentListeners) },
      ...events(browserListeners)
    };
    for (const [key, value] of Object.entries(replacements)) {
      descriptors.set(key, Object.getOwnPropertyDescriptor(window, key));
      Object.defineProperty(window, key, { configurable: true, value });
    }
    onChange = jest.fn();
    unsubscribe = subscribeToExternalTokenChanges(onChange);
  });

  afterEach(() => {
    unsubscribe();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(window, key, descriptor);
      else delete (window as any)[key];
    }
    descriptors.clear();
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalPlatform
    });
  });

  it("invalidates the old Owner tab once and preserves the personal recipient's token", () => {
    writeFromOtherTab("personal-recipient-token");
    emit("focus");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(storage.getItem(KEY)).toBe("personal-recipient-token");
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  });

  it.each([KEY, null])("detects token removal or storage.clear (key %s)", (key) => {
    writeFromOtherTab(null, key);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("ignores same-token, unrelated, and sessionStorage events", () => {
    writeFromOtherTab("owner-token");
    writeFromOtherTab("personal-recipient-token", "theme-mode");
    emit("storage", { key: KEY, storageArea: {}, newValue: "another-token" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("uses current storage instead of a queued intermediate removal event", () => {
    emit("storage", { key: KEY, storageArea: storage, newValue: null });
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each(["focus", "pageshow", "visibilitychange"])(
    "recovers a missed change on %s",
    (eventName) => {
      values.set(KEY, "personal-recipient-token");
      if (eventName === "visibilitychange") {
        for (const listener of documentListeners.get(eventName) || []) listener();
      } else emit(eventName);
      expect(onChange).toHaveBeenCalledTimes(1);
    }
  );

  it("keeps same-tab login and logout from causing a reload", async () => {
    await setToken(null);
    emit("focus");
    await setToken("personal-recipient-token");
    emit("focus");
    expect(onChange).not.toHaveBeenCalled();
    writeFromOtherTab("third-account-token");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not interpret unavailable storage as logout", () => {
    (storage.getItem as jest.Mock).mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
    emit("focus");
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each(["ios", "android"])("does not monitor browser storage on %s", (platform) => {
    unsubscribe();
    (storage.getItem as jest.Mock).mockClear();
    Object.defineProperty(Platform, "OS", { configurable: true, value: platform });

    unsubscribe = subscribeToExternalTokenChanges(onChange);
    writeFromOtherTab("personal-recipient-token");
    emit("focus");

    expect(storage.getItem).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect([...browserListeners.values()].every((listeners) => !listeners.size)).toBe(
      true
    );
    expect([...documentListeners.values()].every((listeners) => !listeners.size)).toBe(
      true
    );
    expect(unsubscribe).not.toThrow();
  });

  it("can initialize and clean up on web without a browser window", () => {
    unsubscribe();
    const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
    Object.defineProperty(globalThis, "window", { configurable: true, value: undefined });
    try {
      unsubscribe = subscribeToExternalTokenChanges(onChange);
      expect(unsubscribe).not.toThrow();
      expect(onChange).not.toHaveBeenCalled();
    } finally {
      if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor);
      else delete (globalThis as any).window;
    }
  });

  it.each(["storage access", "initial token read"])(
    "does not reload or register listeners when %s fails",
    (failure) => {
      unsubscribe();
      const unavailable = () => {
        throw new Error("Storage unavailable");
      };
      if (failure === "storage access") {
        Object.defineProperty(window, "localStorage", {
          configurable: true,
          get: unavailable
        });
      } else {
        (storage.getItem as jest.Mock).mockImplementation(unavailable);
      }

      unsubscribe = subscribeToExternalTokenChanges(onChange);
      writeFromOtherTab("personal-recipient-token");
      emit("focus");

      expect(onChange).not.toHaveBeenCalled();
      expect([...browserListeners.values()].every((listeners) => !listeners.size)).toBe(
        true
      );
      expect([...documentListeners.values()].every((listeners) => !listeners.size)).toBe(
        true
      );
      expect(storage.setItem).not.toHaveBeenCalled();
      expect(storage.removeItem).not.toHaveBeenCalled();
      expect(unsubscribe).not.toThrow();
    }
  );

  it("removes browser and document listeners on cleanup", () => {
    unsubscribe();
    writeFromOtherTab("personal-recipient-token");
    emit("focus");
    expect(onChange).not.toHaveBeenCalled();
    expect([...browserListeners.values()].every((listeners) => !listeners.size)).toBe(
      true
    );
    expect([...documentListeners.values()].every((listeners) => !listeners.size)).toBe(
      true
    );
  });
});
