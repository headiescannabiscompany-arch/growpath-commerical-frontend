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
});
