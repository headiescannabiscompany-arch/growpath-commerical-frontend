import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  canonicalizeGiftCheckoutFingerprint,
  clearGiftCheckoutAttempt,
  clearClosedGiftCheckoutAttempt,
  getOrCreateGiftCheckoutAttemptId,
  GIFT_CHECKOUT_ATTEMPT_STORAGE_KEY
} from "@/features/billing/giftCheckoutAttempt";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const baseFingerprint = {
  plan: "pro",
  interval: "monthly",
  recipientEmail: "friend@example.com",
  recipientName: "Friend",
  message: "Enjoy GrowPath",
  successUrl: "https://growpathai.com/offers",
  cancelUrl: "https://growpathai.com/offers"
};

describe("gift checkout attempt identity", () => {
  const originalWindow = (globalThis as any).window;
  const nativeValues = new Map<string, string>();

  beforeEach(async () => {
    (globalThis as any).window = undefined;
    nativeValues.clear();
    (AsyncStorage.getItem as jest.Mock).mockImplementation(
      async (key: string) => nativeValues.get(key) ?? null
    );
    (AsyncStorage.setItem as jest.Mock).mockImplementation(
      async (key: string, value: string) => {
        nativeValues.set(key, value);
      }
    );
    (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
      nativeValues.delete(key);
    });
    (AsyncStorage.clear as jest.Mock).mockImplementation(async () => {
      nativeValues.clear();
    });
    await clearGiftCheckoutAttempt();
    await AsyncStorage.clear();
  });

  afterAll(() => {
    (globalThis as any).window = originalWindow;
  });

  it("canonicalizes only material request fields", () => {
    const canonical = canonicalizeGiftCheckoutFingerprint({
      ...baseFingerprint,
      plan: " PRO ",
      interval: " MONTHLY ",
      recipientEmail: " Friend@Example.com ",
      recipientName: " Friend ",
      message: " Enjoy GrowPath ",
      successUrl: " https://growpathai.com:443/offers ",
      cancelUrl: " https://growpathai.com:443/offers "
    });

    expect(canonical).toBe(JSON.stringify(baseFingerprint));
  });

  it("reuses one UUID for the canonical fingerprint and rotates after an edit", async () => {
    const first = await getOrCreateGiftCheckoutAttemptId(baseFingerprint);
    const normalizedRetry = await getOrCreateGiftCheckoutAttemptId({
      ...baseFingerprint,
      recipientEmail: " Friend@Example.com ",
      recipientName: " Friend ",
      message: " Enjoy GrowPath "
    });
    const edited = await getOrCreateGiftCheckoutAttemptId({
      ...baseFingerprint,
      message: "A materially different note"
    });

    expect(first).toMatch(UUID_V4);
    expect(normalizedRetry).toBe(first);
    expect(edited).toMatch(UUID_V4);
    expect(edited).not.toBe(first);
  });

  it("persists only a fingerprint hash and UUID without direct recipient fields", async () => {
    const checkoutAttemptId = await getOrCreateGiftCheckoutAttemptId(baseFingerprint);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      GIFT_CHECKOUT_ATTEMPT_STORAGE_KEY,
      expect.any(String)
    );
    const storedValue = (AsyncStorage.setItem as jest.Mock).mock.calls.at(-1)?.[1];
    expect(GIFT_CHECKOUT_ATTEMPT_STORAGE_KEY).not.toContain("friend");
    expect(storedValue).not.toContain("friend@example.com");
    expect(storedValue).not.toContain("Enjoy GrowPath");
    expect(JSON.parse(storedValue)).toEqual({
      version: 1,
      fingerprintHash: expect.stringMatching(/^[0-9a-f]{32}$/),
      checkoutAttemptId
    });
  });

  it("uses browser sessionStorage without putting recipient data in storage", async () => {
    const values = new Map<string, string>();
    const sessionStorage = {
      getItem: jest.fn((key: string) => values.get(key) ?? null),
      removeItem: jest.fn((key: string) => values.delete(key)),
      setItem: jest.fn((key: string, value: string) => values.set(key, value))
    };
    (globalThis as any).window = { sessionStorage };

    const first = await getOrCreateGiftCheckoutAttemptId(baseFingerprint);
    await clearGiftCheckoutAttempt();
    values.set(
      GIFT_CHECKOUT_ATTEMPT_STORAGE_KEY,
      sessionStorage.setItem.mock.calls[0][1]
    );
    const restored = await getOrCreateGiftCheckoutAttemptId(baseFingerprint);

    expect(restored).toBe(first);
    expect(sessionStorage.setItem).toHaveBeenCalledWith(
      GIFT_CHECKOUT_ATTEMPT_STORAGE_KEY,
      expect.not.stringContaining("friend@example.com")
    );
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it("rotates only after a definitely unpaid closure", async () => {
    const first = await getOrCreateGiftCheckoutAttemptId(baseFingerprint);

    for (const code of [
      "GIFT_CHECKOUT_CREATION_UNKNOWN",
      "GIFT_CHECKOUT_ATTEMPT_CONFLICT",
      "GIFT_CHECKOUT_ATTEMPT_NOT_OPEN"
    ]) {
      await expect(clearClosedGiftCheckoutAttempt({ code })).resolves.toBe(false);
      await expect(getOrCreateGiftCheckoutAttemptId(baseFingerprint)).resolves.toBe(
        first
      );
    }

    await expect(
      clearClosedGiftCheckoutAttempt({ code: "GIFT_CHECKOUT_ATTEMPT_EXPIRED" })
    ).resolves.toBe(true);
    const next = await getOrCreateGiftCheckoutAttemptId(baseFingerprint);
    expect(next).toMatch(UUID_V4);
    expect(next).not.toBe(first);
  });

  it("fails before checkout when native retry storage cannot be read", async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error("blocked"));

    await expect(getOrCreateGiftCheckoutAttemptId(baseFingerprint)).rejects.toMatchObject(
      {
        code: "GIFT_CHECKOUT_ATTEMPT_STORAGE_UNAVAILABLE",
        message: expect.stringContaining("No checkout was created")
      }
    );
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it("fails before checkout when native retry storage cannot be written", async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("full"));

    await expect(getOrCreateGiftCheckoutAttemptId(baseFingerprint)).rejects.toMatchObject(
      {
        code: "GIFT_CHECKOUT_ATTEMPT_STORAGE_UNAVAILABLE",
        message: expect.stringContaining("No checkout was created")
      }
    );
  });

  it("fails closed when browser retry storage is unavailable or corrupt", async () => {
    (globalThis as any).window = {};
    await expect(getOrCreateGiftCheckoutAttemptId(baseFingerprint)).rejects.toMatchObject(
      {
        code: "GIFT_CHECKOUT_ATTEMPT_STORAGE_UNAVAILABLE"
      }
    );

    const sessionStorage = {
      getItem: jest.fn(() => "not-a-valid-attempt"),
      removeItem: jest.fn(),
      setItem: jest.fn()
    };
    (globalThis as any).window = { sessionStorage };
    await expect(getOrCreateGiftCheckoutAttemptId(baseFingerprint)).rejects.toMatchObject(
      {
        code: "GIFT_CHECKOUT_ATTEMPT_STORAGE_INVALID"
      }
    );
    expect(sessionStorage.setItem).not.toHaveBeenCalled();

    const nonPersistentSessionStorage = {
      getItem: jest.fn(() => null),
      removeItem: jest.fn(),
      setItem: jest.fn()
    };
    (globalThis as any).window = { sessionStorage: nonPersistentSessionStorage };
    await expect(getOrCreateGiftCheckoutAttemptId(baseFingerprint)).rejects.toMatchObject(
      {
        code: "GIFT_CHECKOUT_ATTEMPT_STORAGE_UNAVAILABLE",
        message: expect.stringContaining("No checkout was created")
      }
    );
  });
});
