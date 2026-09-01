const mockApiRequest = jest.fn();

function sentGift(overrides: Record<string, any> = {}) {
  return {
    id: "gift-1",
    plan: "pro",
    interval: "yearly",
    amountCents: 9900,
    currency: "usd",
    recipientEmailMasked: "c***@example.com",
    recipientName: "Casey",
    message: "Enjoy GrowPath",
    state: "awaiting_claim",
    createdAt: "2030-01-01T12:00:00.000Z",
    paidAt: "2030-01-01T12:01:00.000Z",
    claimExpiresAt: "2031-01-01T12:00:00.000Z",
    claimedAt: null,
    refundedAt: null,
    nextActionAt: null,
    actions: {
      canResend: true,
      resendRequiresAcknowledgement: false,
      canCancelAndRefund: false,
      requiresSupport: false,
      nextActionAt: null
    },
    ...overrides
  };
}

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

describe("purchaser gift subscription API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("loads a cursor page without caching it", async () => {
    mockApiRequest.mockResolvedValue({
      data: {
        gifts: [sentGift()],
        nextCursor: "cursor-2"
      }
    });
    const { listSentGifts } = require("@/api/subscription");

    await expect(listSentGifts({ limit: 10, cursor: "cursor-1" })).resolves.toEqual({
      gifts: [sentGift()],
      nextCursor: "cursor-2"
    });
    expect(mockApiRequest).toHaveBeenCalledWith("/api/subscription/gifts", {
      method: "GET",
      cache: "no-store",
      params: { limit: 10, cursor: "cursor-1" }
    });
  });

  it("loads an individual gift using an encoded id", async () => {
    mockApiRequest.mockResolvedValue({ gift: sentGift({ id: "gift/one" }) });
    const { getSentGift } = require("@/api/subscription");

    await expect(getSentGift("gift/one")).resolves.toEqual(sentGift({ id: "gift/one" }));
    expect(mockApiRequest).toHaveBeenCalledWith("/api/subscription/gifts/gift%2Fone", {
      method: "GET",
      cache: "no-store"
    });
  });

  it("sends the explicit acknowledgement only for a possible duplicate resend", async () => {
    mockApiRequest.mockResolvedValue({
      data: {
        sent: true,
        gift: sentGift({
          state: "delivery_in_progress",
          actions: {
            canResend: false,
            resendRequiresAcknowledgement: false,
            canCancelAndRefund: false,
            requiresSupport: false,
            nextActionAt: null
          }
        })
      }
    });
    const { resendSentGift } = require("@/api/subscription");

    await expect(
      resendSentGift("gift-1", { acknowledgePossibleDuplicate: true })
    ).resolves.toEqual({
      sent: true,
      gift: sentGift({
        state: "delivery_in_progress",
        actions: {
          canResend: false,
          resendRequiresAcknowledgement: false,
          canCancelAndRefund: false,
          requiresSupport: false,
          nextActionAt: null
        }
      })
    });
    expect(mockApiRequest).toHaveBeenCalledWith("/api/subscription/gifts/gift-1/resend", {
      method: "POST",
      body: { acknowledgePossibleDuplicate: true }
    });
  });

  it.each([
    null,
    {},
    { gifts: null, nextCursor: null },
    { gifts: [sentGift({ actions: null })], nextCursor: null },
    { gifts: [sentGift()], nextCursor: 42 }
  ])("rejects malformed successful list payload %p", async (payload) => {
    mockApiRequest.mockResolvedValue({ data: payload });
    const { listSentGifts } = require("@/api/subscription");

    await expect(listSentGifts()).rejects.toThrow(
      "The gift history response was invalid."
    );
  });

  it("requests and validates a recipient-bound authoritative gift quote", async () => {
    const quote = {
      schemaVersion: "gift_quote_v1",
      version: 1,
      plan: "pro",
      interval: "yearly",
      quantity: 1,
      amountCents: 12345,
      currency: "usd",
      renews: false,
      issuedAt: "2030-01-01T12:00:00.000Z",
      expiresAt: "2030-01-01T12:05:00.000Z",
      confirmationToken: "1.eyJzYWZlIjoidGVzdCJ9.c2lnbmF0dXJl"
    };
    mockApiRequest.mockResolvedValue({ data: { quote } });
    const { createGiftCheckoutQuote } = require("@/api/subscription");

    await expect(
      createGiftCheckoutQuote({
        plan: "pro",
        interval: "yearly",
        checkoutAttemptId: " 123e4567-e89b-42d3-a456-426614174000 ",
        giftRecipientEmail: " Friend@Example.com ",
        giftRecipientName: " Friend ",
        giftMessage: " Enjoy GrowPath "
      })
    ).resolves.toEqual(quote);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/subscription/gifts/checkout/quote",
      {
        method: "POST",
        auth: true,
        cache: "no-store",
        body: {
          plan: "pro",
          interval: "yearly",
          checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000",
          giftRecipientEmail: "friend@example.com",
          giftRecipientName: "Friend",
          giftMessage: "Enjoy GrowPath"
        }
      }
    );
  });

  it.each([
    { version: 2 },
    { amountCents: 0 },
    { renews: true },
    { confirmationToken: "unsigned" },
    { expiresAt: "2029-01-01T12:00:00.000Z" },
    { interval: "yearly" }
  ])("rejects a malformed authoritative quote field %p", async (override) => {
    mockApiRequest.mockResolvedValue({
      quote: {
        schemaVersion: "gift_quote_v1",
        version: 1,
        plan: "pro",
        interval: "monthly",
        quantity: 1,
        amountCents: 1000,
        currency: "usd",
        renews: false,
        issuedAt: "2030-01-01T12:00:00.000Z",
        expiresAt: "2030-01-01T12:05:00.000Z",
        confirmationToken: "1.eyJzYWZlIjoidGVzdCJ9.c2lnbmF0dXJl",
        ...override
      }
    });
    const { createGiftCheckoutQuote } = require("@/api/subscription");

    await expect(
      createGiftCheckoutQuote({
        plan: "pro",
        interval: "monthly",
        checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000",
        giftRecipientEmail: "friend@example.com"
      })
    ).rejects.toThrow("The gift checkout quote response was invalid");
  });

  it("sends the signed quote token while omitting client-owned gift return URLs", async () => {
    mockApiRequest.mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/test" });
    const { createCheckoutSession } = require("@/api/subscription");

    await createCheckoutSession({
      plan: "pro",
      interval: "monthly",
      giftMode: true,
      giftRecipientEmail: "friend@example.com",
      checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000",
      giftQuoteToken: "1.payload.signature",
      successUrl: "https://attacker.example/success",
      cancelUrl: "https://attacker.example/cancel"
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/subscription/create-checkout-session",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({
          giftMode: true,
          checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000",
          giftQuoteToken: "1.payload.signature"
        })
      })
    );
    const body = mockApiRequest.mock.calls[0][1].body;
    expect(body).not.toHaveProperty("successUrl");
    expect(body).not.toHaveProperty("cancelUrl");
  });

  it("accepts the canonical direct reconciliation payload", async () => {
    const result = {
      state: "settled",
      checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000",
      paymentConfirmed: true,
      canResume: false,
      canStartNewAttempt: true,
      checkoutUrl: null,
      amountCents: 9900,
      currency: "usd",
      expiresAt: "2099-01-01T13:00:00.000Z",
      gift: sentGift()
    };
    mockApiRequest.mockResolvedValue({ data: result });
    const { reconcileGiftCheckout } = require("@/api/subscription");

    await expect(
      reconcileGiftCheckout({ sessionId: "cs_test_valid_session" })
    ).resolves.toEqual(result);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/subscription/gifts/checkout/reconcile",
      {
        method: "POST",
        auth: true,
        cache: "no-store",
        body: { sessionId: "cs_test_valid_session" }
      }
    );
  });

  it("accepts only an exact resumable Stripe checkout shape", async () => {
    const result = {
      state: "open_unpaid",
      checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000",
      paymentConfirmed: false,
      canResume: true,
      canStartNewAttempt: false,
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_safe",
      amountCents: 1000,
      currency: "usd",
      expiresAt: "2099-01-01T13:00:00.000Z",
      gift: sentGift({ state: "checkout_pending", paidAt: null, amountCents: 1000 })
    };
    mockApiRequest.mockResolvedValue(result);
    const {
      isSafeStripeCheckoutUrl,
      reconcileGiftCheckout
    } = require("@/api/subscription");

    await expect(
      reconcileGiftCheckout({
        checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000"
      })
    ).resolves.toEqual(result);
    expect(isSafeStripeCheckoutUrl(result.checkoutUrl)).toBe(true);
    expect(isSafeStripeCheckoutUrl("https://checkout.stripe.com/c/pay/not-session")).toBe(
      false
    );
    expect(
      isSafeStripeCheckoutUrl("https://checkout.stripe.com/c/pay/cs_test_safe/extra")
    ).toBe(false);
    expect(
      isSafeStripeCheckoutUrl("https://checkout.stripe.com/c/pay/cs_test_safe/")
    ).toBe(false);
    expect(isSafeStripeCheckoutUrl("https://checkout.stripe.com/pay/not-c-pay")).toBe(
      false
    );
    expect(isSafeStripeCheckoutUrl("https://checkout.stripe.com:444/c/pay/session")).toBe(
      false
    );
    expect(
      isSafeStripeCheckoutUrl("https://checkout.stripe.com.evil.example/c/pay/session")
    ).toBe(false);
  });

  it("rejects an attempt reconciliation response correlated to a different id", async () => {
    mockApiRequest.mockResolvedValue({
      state: "pending",
      checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174001",
      paymentConfirmed: false,
      canResume: false,
      canStartNewAttempt: false,
      checkoutUrl: null,
      amountCents: 1000,
      currency: "usd",
      expiresAt: "2099-01-01T13:00:00.000Z",
      gift: sentGift({ state: "checkout_pending", paidAt: null, amountCents: 1000 })
    });
    const { reconcileGiftCheckout } = require("@/api/subscription");

    await expect(
      reconcileGiftCheckout({
        checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000"
      })
    ).rejects.toThrow("The gift checkout status response was invalid");
  });

  it("accepts a distinct not-created terminal result that permits a new attempt", async () => {
    const result = {
      state: "not_created",
      checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000",
      paymentConfirmed: false,
      canResume: false,
      canStartNewAttempt: true,
      checkoutUrl: null,
      amountCents: 1000,
      currency: "usd",
      expiresAt: "2099-01-01T13:00:00.000Z",
      gift: sentGift({ state: "canceled", paidAt: null, amountCents: 1000 })
    };
    mockApiRequest.mockResolvedValue(result);
    const { reconcileGiftCheckout } = require("@/api/subscription");

    await expect(
      reconcileGiftCheckout({
        checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000"
      })
    ).resolves.toEqual(result);
  });

  it.each([
    { state: "invented" },
    { state: "settled", paymentConfirmed: false },
    {
      state: "pending",
      paymentConfirmed: true
    },
    {
      state: "open_unpaid",
      canResume: true,
      checkoutUrl: "https://evil.example/c/pay/session"
    },
    {
      state: "open_unpaid",
      canResume: true,
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_safe",
      expiresAt: null
    },
    {
      state: "open_unpaid",
      canResume: true,
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_safe",
      expiresAt: "2020-01-01T13:00:00.000Z"
    },
    {
      state: "open_unpaid",
      canResume: true,
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_safe",
      expiresAt: "2099-01-01T13:00:00.000Z",
      gift: sentGift({
        state: "awaiting_claim",
        paidAt: "2099-01-01T12:00:00.000Z",
        amountCents: 1000
      })
    },
    {
      state: "pending",
      canResume: true,
      checkoutUrl: "https://checkout.stripe.com/c/pay/session"
    },
    { state: "expired", canStartNewAttempt: false },
    {
      state: "settled",
      paymentConfirmed: true,
      gift: sentGift({
        state: "checkout_pending",
        paidAt: null,
        amountCents: 1000
      })
    },
    {
      state: "settled",
      paymentConfirmed: true,
      amountCents: null,
      currency: null,
      gift: sentGift({ amountCents: null, currency: null })
    },
    { amountCents: 2000 },
    { currency: "eur" },
    {
      state: "expired",
      canStartNewAttempt: true,
      gift: sentGift({ state: "checkout_pending", paidAt: null, amountCents: 1000 })
    },
    {
      state: "support",
      canStartNewAttempt: true,
      gift: sentGift({ state: "canceled", paidAt: null, amountCents: 1000 })
    },
    {
      state: "not_created",
      canStartNewAttempt: false,
      gift: sentGift({ state: "canceled", paidAt: null, amountCents: 1000 })
    },
    {
      state: "not_created",
      canStartNewAttempt: true,
      gift: sentGift({ state: "checkout_pending", paidAt: null, amountCents: 1000 })
    },
    { checkoutAttemptId: undefined },
    { checkoutAttemptId: "short" },
    { checkoutAttemptId: ["123e4567-e89b-42d3-a456-426614174000"] },
    {
      checkoutAttemptId: {
        toString: (): string => "123e4567-e89b-42d3-a456-426614174000"
      }
    },
    { state: ["pending"] },
    { currency: ["usd"] },
    { currency: { toString: (): string => "usd" } },
    { unexpected: true },
    { gift: sentGift({ plan: "enterprise", amountCents: 1000, paidAt: null }) },
    { gift: sentGift({ interval: "weekly", amountCents: 1000, paidAt: null }) }
  ])("rejects contradictory reconciliation data %p", async (override) => {
    mockApiRequest.mockResolvedValue(
      Object.assign(
        {
          state: "pending",
          checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000",
          paymentConfirmed: false,
          canResume: false,
          canStartNewAttempt: false,
          checkoutUrl: null,
          amountCents: 1000,
          currency: "usd",
          expiresAt: "2099-01-01T13:00:00.000Z",
          gift: sentGift({ state: "checkout_pending", paidAt: null, amountCents: 1000 })
        },
        override
      )
    );
    const { reconcileGiftCheckout } = require("@/api/subscription");

    await expect(
      reconcileGiftCheckout({
        checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000"
      })
    ).rejects.toThrow("The gift checkout status response was invalid");
  });

  it("loads and validates purchaser-scoped active checkout recovery", async () => {
    const recovery = {
      state: "recoverable",
      attempt: {
        checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000",
        checkoutState: "creation_unknown",
        plan: "pro",
        interval: "monthly",
        amountCents: 1234,
        currency: "usd",
        expiresAt: "2099-01-01T13:00:00.000Z",
        canReconcile: true
      }
    };
    mockApiRequest.mockResolvedValue({ data: recovery });
    const { getGiftCheckoutRecovery } = require("@/api/subscription");

    await expect(getGiftCheckoutRecovery()).resolves.toEqual(recovery);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/subscription/gifts/checkout/recovery",
      { method: "GET", auth: true, cache: "no-store" }
    );
  });

  it.each([
    { state: "none", attempt: null },
    { state: "support", attempt: null }
  ])("accepts recovery status %p without inventing an attempt", async (status) => {
    mockApiRequest.mockResolvedValue(status);
    const { getGiftCheckoutRecovery } = require("@/api/subscription");

    await expect(getGiftCheckoutRecovery()).resolves.toEqual(status);
  });

  it.each([
    { state: "recoverable", attempt: null },
    { state: "none", attempt: { checkoutAttemptId: "hidden" } },
    { state: ["none"], attempt: null },
    { state: "none", attempt: null, unexpected: true },
    {
      state: "recoverable",
      attempt: {
        checkoutAttemptId: "short",
        checkoutState: "open",
        plan: "pro",
        interval: "monthly",
        amountCents: 1000,
        currency: "usd",
        expiresAt: "2099-01-01T13:00:00.000Z",
        canReconcile: true
      }
    },
    {
      state: "recoverable",
      attempt: {
        checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000",
        checkoutState: "settled",
        plan: "pro",
        interval: "monthly",
        amountCents: 1000,
        currency: "usd",
        expiresAt: "2099-01-01T13:00:00.000Z",
        canReconcile: true
      }
    },
    {
      state: "recoverable",
      attempt: {
        checkoutAttemptId: ["123e4567-e89b-42d3-a456-426614174000"],
        checkoutState: "open",
        plan: "pro",
        interval: "monthly",
        amountCents: 1000,
        currency: "usd",
        expiresAt: "2099-01-01T13:00:00.000Z",
        canReconcile: true
      }
    },
    {
      state: "recoverable",
      attempt: {
        checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000",
        checkoutState: "open",
        plan: "pro",
        interval: "monthly",
        amountCents: 1000,
        currency: { toString: (): string => "usd" },
        expiresAt: "2099-01-01T13:00:00.000Z",
        canReconcile: true
      }
    },
    {
      state: "recoverable",
      attempt: {
        checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000",
        checkoutState: "open",
        plan: "pro",
        interval: "monthly",
        amountCents: 1000,
        currency: "usd",
        expiresAt: "2099-01-01T13:00:00.000Z",
        canReconcile: true,
        unexpected: true
      }
    }
  ])("rejects malformed recovery status %p", async (status) => {
    mockApiRequest.mockResolvedValue(status);
    const { getGiftCheckoutRecovery } = require("@/api/subscription");

    await expect(getGiftCheckoutRecovery()).rejects.toThrow(
      "The gift checkout recovery response was invalid"
    );
  });

  it("requires exactly one valid reconciliation identity before transport", async () => {
    const { reconcileGiftCheckout } = require("@/api/subscription");

    await expect(reconcileGiftCheckout({})).rejects.toThrow(
      "Exactly one valid gift checkout identity is required"
    );
    await expect(
      reconcileGiftCheckout({
        sessionId: "cs_test_valid_session",
        recoverActiveAttempt: true
      } as any)
    ).rejects.toThrow("Exactly one valid gift checkout identity is required");
    await expect(
      reconcileGiftCheckout({ recoverActiveAttempt: false } as any)
    ).rejects.toThrow("Exactly one valid gift checkout identity is required");
    await expect(
      reconcileGiftCheckout({
        checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000",
        unexpected: true
      } as any)
    ).rejects.toThrow("Exactly one valid gift checkout identity is required");
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});
