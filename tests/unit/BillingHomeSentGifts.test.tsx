import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import {
  getSubscription,
  listSentGifts,
  resendSentGift,
  type SentGift
} from "@/api/subscription";
import BillingHome, {
  formatSentGiftAmount
} from "@/features/billing/screens/BillingHome";

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ token: "sent-gifts-test-token" })
}));

jest.mock("@/api/subscription", () => ({
  createCheckoutSession: jest.fn(),
  getSubscription: jest.fn(),
  isSentGift: (value: any) => Boolean(value?.id && value?.actions),
  listSentGifts: jest.fn(),
  resendSentGift: jest.fn()
}));

jest.mock("@/api/subscribe", () => ({
  cancelSubscription: jest.fn()
}));

jest.mock("@/utils/openExternalUrl", () => ({
  openExternalUrl: jest.fn()
}));

function sentGift(overrides: Partial<SentGift> = {}): SentGift {
  return {
    id: "gift-123",
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
      requiresSupport: false
    },
    ...overrides
  };
}

describe("BillingHome gifts sent by the purchaser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSubscription as jest.Mock).mockResolvedValue({
      plan: "free",
      subscriptionStatus: "inactive",
      source: "account"
    });
    (listSentGifts as jest.Mock).mockResolvedValue({ gifts: [], nextCursor: null });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows a compact loading state and removes the section when history is empty", async () => {
    let resolveHistory!: (page: { gifts: SentGift[]; nextCursor: null }) => void;
    (listSentGifts as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveHistory = resolve;
      })
    );

    const screen = render(<BillingHome />);

    expect(screen.getByText("Gifts you sent")).toBeTruthy();
    expect(screen.getByText("Checking gift history...")).toBeTruthy();

    await act(async () => {
      resolveHistory({ gifts: [], nextCursor: null });
    });

    await waitFor(() => expect(screen.queryByText("Gifts you sent")).toBeNull());
    expect(screen.getByText("Billing")).toBeTruthy();
  });

  it("keeps the purchaser-history route separate from upgrade and cancellation", async () => {
    (getSubscription as jest.Mock).mockResolvedValue({
      plan: "pro",
      subscriptionStatus: "active",
      source: "stripe",
      billingOwner: "account",
      canManageBilling: true,
      canCancelSubscription: true
    });

    const screen = render(<BillingHome purchaserHistoryOnly />);

    expect(await screen.findByText("Gifts you sent")).toBeTruthy();
    expect(
      await screen.findByText(
        "You have not purchased any prepaid gifts from this account."
      )
    ).toBeTruthy();
    expect(getSubscription).not.toHaveBeenCalled();
    expect(screen.queryByText("Billing")).toBeNull();
    expect(screen.queryByLabelText("Cancel subscription")).toBeNull();
    expect(screen.queryByLabelText("Upgrade to Pro")).toBeNull();
  });

  it("shows truthful recipient, term, amount, state, and support guidance", async () => {
    const supportGift = sentGift({
      id: "gift-support",
      recipientName: "Morgan",
      recipientEmailMasked: "m***@example.net",
      state: "support_required",
      actions: {
        canResend: false,
        resendRequiresAcknowledgement: false,
        canCancelAndRefund: false,
        requiresSupport: true
      }
    });
    (listSentGifts as jest.Mock).mockResolvedValue({
      gifts: [sentGift(), supportGift],
      nextCursor: "later-page"
    });

    const screen = render(<BillingHome />);

    await waitFor(() =>
      expect(screen.getByText("Casey - c***@example.com")).toBeTruthy()
    );
    expect(screen.getAllByText("Pro - Yearly prepaid gift")).toHaveLength(2);
    expect(screen.getAllByText("$99.00")).toHaveLength(2);
    expect(screen.getByText("Waiting to be claimed")).toBeTruthy();
    expect(screen.getByText("Support review required")).toBeTruthy();
    expect(
      screen.getByText(
        "Email billing@growpathai.com and include gift ID gift-support. Do not purchase a replacement until support confirms the outcome."
      )
    ).toBeTruthy();
    expect(screen.queryByText(/cancel and refund/i)).toBeNull();
    expect(screen.queryByLabelText(/cancel gift/i)).toBeNull();
  });

  it("labels a null amount as unavailable instead of displaying a zero charge", async () => {
    (listSentGifts as jest.Mock).mockResolvedValue({
      gifts: [sentGift({ amountCents: null })],
      nextCursor: null
    });

    const screen = render(<BillingHome />);

    expect(await screen.findByText("Amount unavailable")).toBeTruthy();
    expect(screen.queryByText("$0.00")).toBeNull();
    expect(formatSentGiftAmount(Number.NaN, "usd")).toBe("Amount unavailable");
    expect(formatSentGiftAmount(0, "usd")).toBe("Amount unavailable");
    expect(formatSentGiftAmount(-1, "usd")).toBe("Amount unavailable");
    expect(formatSentGiftAmount(100, null)).toBe("Amount unavailable");
    expect(formatSentGiftAmount(9900, "jpy")).toBe(
      new Intl.NumberFormat(undefined, { currency: "JPY", style: "currency" }).format(
        9900
      )
    );
    expect(formatSentGiftAmount(1000, "kwd")).toBe(
      new Intl.NumberFormat(undefined, { currency: "KWD", style: "currency" }).format(10)
    );
  });

  it("loads more gifts, appends new records, and deduplicates updated records", async () => {
    const claimedGift = sentGift({
      state: "claimed",
      claimedAt: "2030-02-01T12:00:00.000Z",
      actions: {
        canResend: false,
        resendRequiresAcknowledgement: false,
        canCancelAndRefund: false,
        requiresSupport: false
      }
    });
    const secondGift = sentGift({
      id: "gift-456",
      recipientName: "Jordan",
      recipientEmailMasked: "j***@example.org",
      state: "refunded",
      refundedAt: "2030-02-02T12:00:00.000Z",
      actions: {
        canResend: false,
        resendRequiresAcknowledgement: false,
        canCancelAndRefund: false,
        requiresSupport: false
      }
    });
    (listSentGifts as jest.Mock)
      .mockResolvedValueOnce({ gifts: [sentGift()], nextCursor: "cursor-2" })
      .mockResolvedValueOnce({
        gifts: [claimedGift, secondGift],
        nextCursor: null
      });

    const screen = render(<BillingHome />);
    fireEvent.press(await screen.findByLabelText("Load more gifts"));

    await waitFor(() =>
      expect(listSentGifts).toHaveBeenNthCalledWith(2, {
        limit: 20,
        cursor: "cursor-2"
      })
    );
    expect(await screen.findByText("Jordan - j***@example.org")).toBeTruthy();
    expect(screen.getAllByText("Casey - c***@example.com")).toHaveLength(1);
    expect(screen.getByText("Claimed")).toBeTruthy();
    expect(screen.getByText("Refunded")).toBeTruthy();
    expect(screen.queryByLabelText("Load more gifts")).toBeNull();
  });

  it("keeps loaded gifts and the pagination retry when loading more fails", async () => {
    (listSentGifts as jest.Mock)
      .mockResolvedValueOnce({ gifts: [sentGift()], nextCursor: "cursor-2" })
      .mockRejectedValueOnce(new Error("next page unavailable"));

    const screen = render(<BillingHome />);
    fireEvent.press(await screen.findByLabelText("Load more gifts"));

    expect(
      await screen.findByText(
        "We couldn't load more gifts. The gifts already shown are unchanged."
      )
    ).toBeTruthy();
    expect(screen.getByText("Casey - c***@example.com")).toBeTruthy();
    expect(screen.getByLabelText("Load more gifts")).toBeTruthy();
    expect(screen.getByText("Billing")).toBeTruthy();
  });

  it("resends a recoverable gift and replaces it with the returned public state", async () => {
    const initialGift = sentGift();
    const updatedGift = sentGift({
      state: "delivery_in_progress",
      actions: {
        canResend: false,
        resendRequiresAcknowledgement: false,
        canCancelAndRefund: false,
        requiresSupport: false
      }
    });
    (listSentGifts as jest.Mock).mockResolvedValue({
      gifts: [initialGift],
      nextCursor: null
    });
    (resendSentGift as jest.Mock).mockResolvedValue({ sent: true, gift: updatedGift });

    const screen = render(<BillingHome />);
    const resend = await screen.findByLabelText(
      "Resend gift to Casey - c***@example.com"
    );

    fireEvent.press(resend);

    await waitFor(() =>
      expect(resendSentGift).toHaveBeenCalledWith("gift-123", {
        acknowledgePossibleDuplicate: false
      })
    );
    expect(await screen.findByText("The gift email was sent.")).toBeTruthy();
    expect(screen.getByText("Preparing delivery")).toBeTruthy();
    expect(screen.queryByText("Resend gift email")).toBeNull();
  });

  it("requires an explicit possible-duplicate acknowledgement before resending", async () => {
    const ambiguousGift = sentGift({
      state: "delivery_unknown",
      actions: {
        canResend: true,
        resendRequiresAcknowledgement: true,
        canCancelAndRefund: false,
        requiresSupport: false
      }
    });
    (listSentGifts as jest.Mock).mockResolvedValue({
      gifts: [ambiguousGift],
      nextCursor: null
    });
    (resendSentGift as jest.Mock).mockResolvedValue({
      sent: true,
      gift: sentGift({ state: "delivery_in_progress" })
    });
    const screen = render(<BillingHome />);
    fireEvent.press(
      await screen.findByLabelText("Resend gift to Casey - c***@example.com")
    );

    expect(screen.getByText("Send this gift email again?")).toBeTruthy();
    expect(screen.getByText(/could create a duplicate/)).toBeTruthy();
    expect(resendSentGift).not.toHaveBeenCalled();

    fireEvent.press(
      screen.getByLabelText("Confirm resend gift to Casey - c***@example.com")
    );

    await waitFor(() =>
      expect(resendSentGift).toHaveBeenCalledWith("gift-123", {
        acknowledgePossibleDuplicate: true
      })
    );
  });

  it("lets the purchaser dismiss a possible-duplicate resend without sending", async () => {
    (listSentGifts as jest.Mock).mockResolvedValue({
      gifts: [
        sentGift({
          state: "delivery_unknown",
          actions: {
            canResend: true,
            resendRequiresAcknowledgement: true,
            canCancelAndRefund: false,
            requiresSupport: false
          }
        })
      ],
      nextCursor: null
    });

    const screen = render(<BillingHome />);
    fireEvent.press(
      await screen.findByLabelText("Resend gift to Casey - c***@example.com")
    );
    fireEvent.press(screen.getByLabelText("Cancel resend to Casey - c***@example.com"));

    expect(screen.queryByText("Send this gift email again?")).toBeNull();
    expect(resendSentGift).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Resend gift to Casey - c***@example.com")).toBeTruthy();
  });

  it("uses the authoritative saved gift returned with a resend error", async () => {
    const savedGift = sentGift({
      state: "delivery_retrying",
      nextActionAt: "2030-01-02T12:00:00.000Z",
      actions: {
        canResend: false,
        resendRequiresAcknowledgement: false,
        canCancelAndRefund: false,
        requiresSupport: false,
        nextActionAt: "2040-01-02T12:00:00.000Z"
      }
    });
    (listSentGifts as jest.Mock).mockResolvedValue({
      gifts: [sentGift()],
      nextCursor: null
    });
    const resendError: any = new Error("Please wait before sending this gift again.");
    resendError.data = { gift: savedGift };
    (resendSentGift as jest.Mock).mockRejectedValue(resendError);

    const screen = render(<BillingHome />);
    fireEvent.press(
      await screen.findByLabelText("Resend gift to Casey - c***@example.com")
    );

    expect(
      await screen.findByText("Please wait before sending this gift again.")
    ).toBeTruthy();
    expect(screen.getByText("Delivery retry scheduled")).toBeTruthy();
    expect(screen.getByText(/Next delivery attempt .*2030/)).toBeTruthy();
    expect(screen.queryByText(/Next delivery attempt .*2040/)).toBeNull();
    expect(screen.queryByText("Resend gift email")).toBeNull();
  });

  it("does not let a refresh overwrite an in-flight resend", async () => {
    let resolveResend!: (value: { sent: boolean; gift: SentGift }) => void;
    (listSentGifts as jest.Mock).mockResolvedValue({
      gifts: [sentGift()],
      nextCursor: null
    });
    (resendSentGift as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveResend = resolve;
      })
    );

    const screen = render(<BillingHome />);
    fireEvent.press(
      await screen.findByLabelText("Resend gift to Casey - c***@example.com")
    );
    await waitFor(() => expect(resendSentGift).toHaveBeenCalledTimes(1));

    const refresh = screen.getByLabelText("Refresh gifts you sent");
    expect(refresh.props.accessibilityState).toEqual({ disabled: true });
    fireEvent.press(refresh);
    expect(listSentGifts).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveResend({
        sent: true,
        gift: sentGift({
          state: "awaiting_claim",
          actions: {
            canResend: false,
            resendRequiresAcknowledgement: false,
            canCancelAndRefund: false,
            requiresSupport: false
          }
        })
      });
    });
  });

  it("does not let a resend overlap an in-flight refresh", async () => {
    let resolveRefresh!: (value: { gifts: SentGift[]; nextCursor: null }) => void;
    (listSentGifts as jest.Mock)
      .mockResolvedValueOnce({ gifts: [sentGift()], nextCursor: null })
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveRefresh = resolve;
        })
      );

    const screen = render(<BillingHome />);
    await screen.findByLabelText("Resend gift to Casey - c***@example.com");
    fireEvent.press(screen.getByLabelText("Refresh gifts you sent"));
    await waitFor(() => expect(listSentGifts).toHaveBeenCalledTimes(2));

    const resend = screen.getByLabelText("Resend gift to Casey - c***@example.com");
    expect(resend.props.accessibilityState).toEqual({ disabled: true });
    fireEvent.press(resend);
    expect(resendSentGift).not.toHaveBeenCalled();

    await act(async () => {
      resolveRefresh({ gifts: [sentGift()], nextCursor: null });
    });
  });

  it("keeps normal billing usable when gift history fails", async () => {
    (getSubscription as jest.Mock).mockResolvedValue({
      plan: "pro",
      subscriptionStatus: "active",
      source: "stripe",
      billingOwner: "account",
      canManageBilling: true,
      canCancelSubscription: true
    });
    (listSentGifts as jest.Mock).mockRejectedValue(new Error("endpoint unavailable"));

    const screen = render(<BillingHome />);

    expect(
      await screen.findByText(
        "We couldn't load gifts you sent. Your current billing status is unaffected."
      )
    ).toBeTruthy();
    expect(screen.getByText("Plan: pro")).toBeTruthy();
    expect(screen.getByLabelText("Cancel subscription")).toBeTruthy();
    expect(screen.getByLabelText("Retry gift history")).toBeTruthy();
  });
});
