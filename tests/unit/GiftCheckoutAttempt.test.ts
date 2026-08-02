import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  canonicalizeGiftCheckoutFingerprint,
  clearGiftCheckoutAttemptWhenAllowed,
  downgradeGiftCheckoutToQuoteOnly,
  getStoredGiftCheckoutAttempt,
  GIFT_CHECKOUT_ATTEMPT_STORAGE_KEY,
  markGiftCheckoutRequested,
  prepareGiftCheckoutQuoteAttempt
} from "@/features/billing/giftCheckoutAttempt";
import { isDefinitelyUncreatedGiftCheckoutError } from "@/features/billing/giftCheckoutReview";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const baseFingerprint = {
  plan: "pro",
  interval: "monthly",
  recipientEmail: "friend@example.com",
  recipientName: "Friend",
  message: "Enjoy GrowPath"
};

describe("gift checkout attempt phases", () => {
  const originalWindow = (globalThis as any).window;
  const nativeValues = new Map<string, string>();

  beforeEach(async () => {
    (globalThis as any).window = undefined;
    nativeValues.clear();
    (AsyncStorage.getItem as jest.Mock)
      .mockReset()
      .mockImplementation(async (key: string) => nativeValues.get(key) ?? null);
    (AsyncStorage.setItem as jest.Mock)
      .mockReset()
      .mockImplementation(async (key: string, value: string) => {
        nativeValues.set(key, value);
      });
    (AsyncStorage.removeItem as jest.Mock)
      .mockReset()
      .mockImplementation(async (key: string) => {
        nativeValues.delete(key);
      });
    await clearGiftCheckoutAttemptWhenAllowed(true);
  });

  afterAll(() => {
    (globalThis as any).window = originalWindow;
  });

  it("canonicalizes only normalized material request fields", () => {
    expect(
      canonicalizeGiftCheckoutFingerprint({
        ...baseFingerprint,
        plan: " PRO ",
        interval: " MONTHLY ",
        recipientEmail: " Friend@Example.com ",
        recipientName: " Friend ",
        message: " Enjoy GrowPath "
      })
    ).toBe(JSON.stringify({ ...baseFingerprint, successUrl: "", cancelUrl: "" }));
  });

  it("reuses a quote-only attempt and rotates safely after a material edit", async () => {
    const first = await prepareGiftCheckoutQuoteAttempt(baseFingerprint);
    const normalizedRetry = await prepareGiftCheckoutQuoteAttempt({
      ...baseFingerprint,
      recipientEmail: " Friend@Example.com ",
      recipientName: " Friend "
    });
    const edited = await prepareGiftCheckoutQuoteAttempt({
      ...baseFingerprint,
      message: "A materially different note"
    });

    expect(first.checkoutAttemptId).toMatch(UUID_V4);
    expect(normalizedRetry.checkoutAttemptId).toBe(first.checkoutAttemptId);
    expect(edited.checkoutAttemptId).toMatch(UUID_V4);
    expect(edited.checkoutAttemptId).not.toBe(first.checkoutAttemptId);
    expect(edited.phase).toBe("quote_only");
  });

  it("persists only a hash, UUID, and safe phase without recipient data", async () => {
    const attempt = await prepareGiftCheckoutQuoteAttempt(baseFingerprint);
    const storedValue = nativeValues.get(GIFT_CHECKOUT_ATTEMPT_STORAGE_KEY) || "";

    expect(storedValue).not.toContain("friend@example.com");
    expect(storedValue).not.toContain("Enjoy GrowPath");
    expect(JSON.parse(storedValue)).toEqual({
      version: 2,
      fingerprintHash: expect.stringMatching(/^[0-9a-f]{32}$/),
      checkoutAttemptId: attempt.checkoutAttemptId,
      phase: "quote_only"
    });
  });

  it("persists and verifies checkout_requested before allowing the create call", async () => {
    const attempt = await prepareGiftCheckoutQuoteAttempt(baseFingerprint);
    const requested = await markGiftCheckoutRequested(
      baseFingerprint,
      attempt.checkoutAttemptId
    );

    expect(requested.phase).toBe("checkout_requested");
    expect(await getStoredGiftCheckoutAttempt()).toEqual({
      checkoutAttemptId: attempt.checkoutAttemptId,
      phase: "checkout_requested",
      legacyVersion: false
    });
    await expect(
      markGiftCheckoutRequested(baseFingerprint, attempt.checkoutAttemptId)
    ).rejects.toMatchObject({ code: "GIFT_CHECKOUT_ATTEMPT_RECONCILE_REQUIRED" });
  });

  it("blocks both same-detail and edited quote rotation after checkout was requested", async () => {
    const attempt = await prepareGiftCheckoutQuoteAttempt(baseFingerprint);
    await markGiftCheckoutRequested(baseFingerprint, attempt.checkoutAttemptId);

    await expect(prepareGiftCheckoutQuoteAttempt(baseFingerprint)).rejects.toMatchObject({
      code: "GIFT_CHECKOUT_ATTEMPT_RECONCILE_REQUIRED"
    });
    await expect(
      prepareGiftCheckoutQuoteAttempt({ ...baseFingerprint, recipientName: "Casey" })
    ).rejects.toMatchObject({
      code: "GIFT_CHECKOUT_ATTEMPT_RECONCILE_REQUIRED"
    });
    expect((await getStoredGiftCheckoutAttempt())?.checkoutAttemptId).toBe(
      attempt.checkoutAttemptId
    );
  });

  it("treats a persisted v1 attempt conservatively as checkout_requested", async () => {
    const legacyId = "123e4567-e89b-42d3-a456-426614174000";
    nativeValues.set(
      GIFT_CHECKOUT_ATTEMPT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        fingerprintHash: "a".repeat(32),
        checkoutAttemptId: legacyId
      })
    );

    await expect(getStoredGiftCheckoutAttempt()).resolves.toEqual({
      checkoutAttemptId: legacyId,
      phase: "checkout_requested",
      legacyVersion: true
    });
    await expect(prepareGiftCheckoutQuoteAttempt(baseFingerprint)).rejects.toMatchObject({
      code: "GIFT_CHECKOUT_ATTEMPT_RECONCILE_REQUIRED"
    });
  });

  it("downgrades only the exact verified requested attempt after a pre-write rejection", async () => {
    const attempt = await prepareGiftCheckoutQuoteAttempt(baseFingerprint);
    await markGiftCheckoutRequested(baseFingerprint, attempt.checkoutAttemptId);

    await expect(
      downgradeGiftCheckoutToQuoteOnly(baseFingerprint, attempt.checkoutAttemptId)
    ).resolves.toMatchObject({
      checkoutAttemptId: attempt.checkoutAttemptId,
      phase: "quote_only"
    });
    await expect(prepareGiftCheckoutQuoteAttempt(baseFingerprint)).resolves.toMatchObject(
      {
        checkoutAttemptId: attempt.checkoutAttemptId,
        phase: "quote_only"
      }
    );
    await expect(
      downgradeGiftCheckoutToQuoteOnly(
        { ...baseFingerprint, message: "tampered" },
        attempt.checkoutAttemptId
      )
    ).rejects.toMatchObject({ code: "GIFT_CHECKOUT_ATTEMPT_RECONCILE_REQUIRED" });
  });

  it.each([
    "UNAUTHENTICATED",
    "ACCOUNT_BANNED",
    "ACCOUNT_SUSPENDED",
    "GIFT_QUOTE_EXPIRED",
    "GIFT_QUOTE_CHANGED",
    "GIFT_QUOTE_INVALID",
    "GIFT_SUBSCRIPTION_NOT_CONFIGURED",
    "GIFT_PRICE_LOOKUP_FAILED",
    "GIFT_PRICE_LOOKUP_NOT_CONFIGURED",
    "GIFT_PRICE_INVALID",
    "MISSING_STRIPE_PRICE",
    "PAYMENT_PROVIDER_NOT_CONFIGURED",
    "TEST_ACCOUNT_PLAN_LOCKED",
    "INVALID_GIFT_RECIPIENT",
    "GIFT_RECIPIENT_IS_PURCHASER",
    "GIFT_PLAN_NOT_SUPPORTED",
    "GIFT_PURCHASER_EMAIL_INVALID",
    "GIFT_QUOTE_NOT_CONFIGURED",
    "UNTRUSTED_CHECKOUT_RETURN_URL"
  ])("classifies %s as an explicit pre-write rejection", (code) => {
    expect(isDefinitelyUncreatedGiftCheckoutError({ code })).toBe(true);
  });

  it.each([
    "FORBIDDEN",
    "HTTP_401",
    "HTTP_403",
    "NETWORK_ERROR",
    "GIFT_CHECKOUT_CREATION_UNKNOWN",
    "GIFT_RECONCILIATION_NOT_FOUND",
    "GIFT_QUOTE_CONFLICT",
    "GIFT_CHECKOUT_ATTEMPT_CONFLICT",
    "",
    undefined
  ])("keeps ambiguous error code %s in checkout_requested", (code) => {
    expect(isDefinitelyUncreatedGiftCheckoutError({ code })).toBe(false);
  });

  it("clears only when the server allows a new attempt and verifies removal", async () => {
    const attempt = await prepareGiftCheckoutQuoteAttempt(baseFingerprint);
    await markGiftCheckoutRequested(baseFingerprint, attempt.checkoutAttemptId);

    await expect(clearGiftCheckoutAttemptWhenAllowed(false)).resolves.toBe(false);
    expect(await getStoredGiftCheckoutAttempt()).not.toBeNull();
    await expect(clearGiftCheckoutAttemptWhenAllowed(true)).resolves.toBe(true);
    expect(await getStoredGiftCheckoutAttempt()).toBeNull();
  });

  it("fails closed when allowed cleanup cannot be verified", async () => {
    const attempt = await prepareGiftCheckoutQuoteAttempt(baseFingerprint);
    await markGiftCheckoutRequested(baseFingerprint, attempt.checkoutAttemptId);
    (AsyncStorage.removeItem as jest.Mock).mockImplementation(async () => undefined);

    await expect(clearGiftCheckoutAttemptWhenAllowed(true)).rejects.toMatchObject({
      code: "GIFT_CHECKOUT_ATTEMPT_STORAGE_UNAVAILABLE"
    });
    expect(nativeValues.has(GIFT_CHECKOUT_ATTEMPT_STORAGE_KEY)).toBe(true);
  });

  it("fails before quoting when retry storage cannot be read or written", async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error("blocked"));
    await expect(prepareGiftCheckoutQuoteAttempt(baseFingerprint)).rejects.toMatchObject({
      code: "GIFT_CHECKOUT_ATTEMPT_STORAGE_UNAVAILABLE",
      message: expect.stringContaining("No checkout was created")
    });

    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("full"));
    await expect(prepareGiftCheckoutQuoteAttempt(baseFingerprint)).rejects.toMatchObject({
      code: "GIFT_CHECKOUT_ATTEMPT_STORAGE_UNAVAILABLE",
      message: expect.stringContaining("No checkout was created")
    });
  });

  it("fails closed on corrupt browser storage without overwriting it", async () => {
    const sessionStorage = {
      getItem: jest.fn(() => "not-a-valid-attempt"),
      removeItem: jest.fn(),
      setItem: jest.fn()
    };
    (globalThis as any).window = { sessionStorage };

    await expect(prepareGiftCheckoutQuoteAttempt(baseFingerprint)).rejects.toMatchObject({
      code: "GIFT_CHECKOUT_ATTEMPT_STORAGE_INVALID"
    });
    expect(sessionStorage.setItem).not.toHaveBeenCalled();
  });
});
