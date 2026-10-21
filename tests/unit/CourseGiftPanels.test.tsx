import React from "react";
import { StyleSheet } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import CourseGiftEntry, {
  CourseGiftBuyerPanel,
  CourseGiftRecipientPanel
} from "@/components/courseGifts/CourseGiftPanels";
import {
  buyerGiftMessage,
  maskedGiftRecipient,
  normalizedGiftEmail,
  recipientGiftMessage,
  usableGiftQuote,
  type GiftBuyerStatus,
  type GiftQuote,
  type GiftRecipientState
} from "@/components/courseGifts/courseGiftPresentation";
import { getThemePalette } from "@/theme/appTheme";

let mockTheme: "day" | "night" = "night";
jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({
      palette: actual.getThemePalette(mockTheme, mockTheme === "day" ? "light" : "dark")
    })
  };
});

const quote: GiftQuote = {
  courseId: "synthetic-course",
  title: "Synthetic course",
  amountCents: 2500,
  currency: "usd",
  checkoutAttemptId: "synthetic-attempt",
  terms: {
    version: "synthetic-policy-v1",
    expiry: "Synthetic claim-window terms.",
    duplicateAccess: "Synthetic duplicate-access terms.",
    courseUnavailable: "Synthetic availability terms."
  }
};
const payment: GiftBuyerStatus = {
  giftId: "synthetic-gift",
  checkoutAttemptId: quote.checkoutAttemptId,
  checkoutStatus: "open",
  paymentRecorded: false,
  recoveryRequired: false
};
const preview: GiftRecipientState = {
  giftId: "synthetic-gift",
  courseId: quote.courseId,
  courseTitle: quote.title,
  recipient: "r***@example.invalid",
  claimExpiresAt: "2099-01-01T00:00:00.000Z",
  code: "COURSE_GIFT_TRANSACTION_REQUIRED"
};
const claimed = {
  action: "claimed" as const,
  giftId: preview.giftId,
  courseId: preview.courseId,
  enrollmentId: "synthetic-enrollment"
};
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
function buyerProps() {
  return {
    scopeKey: "synthetic-session-1",
    availability: "ready" as const,
    quote,
    onCheckout: jest.fn().mockResolvedValue(payment),
    onRefresh: jest.fn().mockResolvedValue(payment)
  };
}
function recipientProps() {
  return {
    scopeKey: "synthetic-session-1",
    state: preview,
    onClaim: jest.fn().mockResolvedValue(claimed),
    onRecheck: jest.fn().mockResolvedValue(preview),
    onSignIn: jest.fn(),
    onOpenCourse: jest.fn()
  };
}
function review(view: ReturnType<typeof render>) {
  fireEvent.changeText(
    view.getByLabelText("Recipient email"),
    " Recipient+Garden@Example.invalid "
  );
  fireEvent.press(view.getByText("Review gift"));
}
function accept(view: ReturnType<typeof render>) {
  review(view);
  fireEvent.press(view.getByLabelText("I reviewed the recipient and gift terms"));
}
async function press(view: ReturnType<typeof render>, label: string) {
  await act(async () => {
    fireEvent.press(view.getByText(label));
  });
}

let fetchGuard: jest.SpyInstance;
beforeEach(() => {
  mockTheme = "night";
  fetchGuard = jest.spyOn(global, "fetch").mockImplementation(() => {
    throw new Error("No network in course-gift panel tests");
  });
});
afterEach(() => {
  expect(fetchGuard).not.toHaveBeenCalled();
  fetchGuard.mockRestore();
});

describe("R09-03A dormant course gift panels", () => {
  it("keeps the public entry empty even with caller capability hints", () => {
    const view = render(
      React.createElement(CourseGiftEntry as any, {
        enabled: true,
        admin: true,
        platform: "web"
      })
    );
    expect(view.toJSON()).toBeNull();
  });
  it.each(["loading", "sign_in", "verify_email", "unavailable"] as const)(
    "hides buyer actions for %s",
    (availability) => {
      const props = buyerProps();
      const view = render(
        <CourseGiftBuyerPanel {...props} availability={availability} />
      );
      expect(view.queryByLabelText("Recipient email")).toBeNull();
      expect(props.onCheckout).not.toHaveBeenCalled();
      expect(props.onRefresh).not.toHaveBeenCalled();
    }
  );
  it.each([
    null,
    { ...quote, amountCents: 0 },
    { ...quote, amountCents: 1.5 },
    { ...quote, currency: "eur" },
    { ...quote, checkoutAttemptId: "" },
    { ...quote, terms: { ...quote.terms, expiry: "" } }
  ])("rejects incomplete quote/terms %#", (bad) => {
    expect(usableGiftQuote(bad as GiftQuote)).toBe(false);
    const view = render(
      <CourseGiftBuyerPanel {...buyerProps()} quote={bad as GiftQuote} />
    );
    expect(view.queryByText("Review gift")).toBeNull();
  });
  it("keeps exact email aliases and rejects invalid email", () => {
    expect(normalizedGiftEmail(" A.B+garden@Example.invalid ")).toBe(
      "a.b+garden@example.invalid"
    );
    expect(normalizedGiftEmail("a@example")).toBe("");
    const view = render(<CourseGiftBuyerPanel {...buyerProps()} />);
    fireEvent.changeText(view.getByLabelText("Recipient email"), "not-an-email");
    fireEvent.press(view.getByText("Review gift"));
    expect(view.queryByText("Continue to checkout")).toBeNull();
  });
  it("requires separate review and unchecked consent; sends only the bound draft", async () => {
    const props = buyerProps();
    const view = render(<CourseGiftBuyerPanel {...props} />);
    review(view);
    expect(view.getByText("One course: USD 25.00")).toBeTruthy();
    expect(view.getByText("Claim window: Synthetic claim-window terms.")).toBeTruthy();
    fireEvent.press(view.getByText("Continue to checkout"));
    expect(props.onCheckout).not.toHaveBeenCalled();
    fireEvent.press(view.getByLabelText("I reviewed the recipient and gift terms"));
    await press(view, "Continue to checkout");
    expect(props.onCheckout).toHaveBeenCalledWith({
      courseId: quote.courseId,
      checkoutAttemptId: quote.checkoutAttemptId,
      recipientEmail: "recipient+garden@example.invalid",
      policyVersion: quote.terms.version
    });
    expect(view.queryByText("Open course")).toBeNull();
  });
  it("editing recipient clears consent", () => {
    const view = render(<CourseGiftBuyerPanel {...buyerProps()} />);
    accept(view);
    fireEvent.press(view.getByText("Edit recipient"));
    fireEvent.press(view.getByText("Review gift"));
    expect(
      view.getByLabelText("I reviewed the recipient and gift terms").props
        .accessibilityState.checked
    ).toBe(false);
  });
  it("single-flights checkout and never repeats it after a lost reply", async () => {
    const props = buyerProps();
    const pending = deferred<GiftBuyerStatus>();
    props.onCheckout.mockReturnValue(pending.promise);
    const view = render(<CourseGiftBuyerPanel {...props} />);
    accept(view);
    const button = view.getByText("Continue to checkout");
    act(() => {
      fireEvent.press(button);
      fireEvent.press(button);
    });
    expect(props.onCheckout).toHaveBeenCalledTimes(1);
    await act(async () => {
      pending.resolve({ ...payment, checkoutAttemptId: "wrong-attempt" });
    });
    expect(view.getByText(/could not confirm this attempt/)).toBeTruthy();
    expect(view.queryByText("Continue to checkout")).toBeNull();
    await press(view, "Check gift payment status");
    expect(props.onRefresh).toHaveBeenCalledWith(quote.checkoutAttemptId);
    expect(props.onCheckout).toHaveBeenCalledTimes(1);
  });
  it("sanitizes checkout errors and rejects changed gift identity on refresh", async () => {
    const props = buyerProps();
    const view = render(<CourseGiftBuyerPanel {...props} />);
    accept(view);
    await press(view, "Continue to checkout");
    props.onRefresh.mockRejectedValueOnce(new Error("secret-token@example.invalid"));
    await press(view, "Check gift payment status");
    expect(view.queryByText(/secret-token/)).toBeNull();
    props.onRefresh.mockResolvedValueOnce({
      ...payment,
      giftId: "another-gift",
      paymentRecorded: true
    });
    await press(view, "Check gift payment status");
    expect(view.getByText(/could not confirm this attempt/)).toBeTruthy();
  });
  it("a payment record is not recipient access, delivered mail or buyer enrollment", async () => {
    const props = buyerProps();
    props.onCheckout.mockResolvedValue({ ...payment, paymentRecorded: true });
    const view = render(<CourseGiftBuyerPanel {...props} />);
    accept(view);
    await press(view, "Continue to checkout");
    expect(
      view.getByText(/does not confirm email delivery or current recipient access/)
    ).toBeTruthy();
    expect(view.queryByText("Open course")).toBeNull();
    expect(buyerGiftMessage({ ...payment, recoveryRequired: true })).toMatch(
      /needs review/
    );
  });
  it.each(["account", "quote", "terms"])(
    "discards old buyer replies/consent after %s change",
    async (change) => {
      const props = buyerProps();
      const pending = deferred<GiftBuyerStatus>();
      props.onCheckout.mockReturnValue(pending.promise);
      const view = render(<CourseGiftBuyerPanel {...props} />);
      accept(view);
      fireEvent.press(view.getByText("Continue to checkout"));
      const next =
        change === "account"
          ? { ...props, scopeKey: "synthetic-session-2" }
          : {
              ...props,
              quote:
                change === "quote"
                  ? { ...quote, amountCents: 3500 }
                  : { ...quote, terms: { ...quote.terms, version: "synthetic-v2" } }
            };
      view.rerender(<CourseGiftBuyerPanel {...next} />);
      await act(async () => {
        pending.resolve({ ...payment, paymentRecorded: true });
      });
      expect(view.getByLabelText("Recipient email").props.value).toBe("");
      expect(view.queryByText(/A payment record exists/)).toBeNull();
    }
  );
  it.each([
    "SIGNED_OUT",
    "COURSE_GIFT_EMAIL_VERIFICATION_REQUIRED",
    "COURSE_GIFT_RECIPIENT_MISMATCH",
    "COURSE_GIFT_ACCESS_REVIEW_REQUIRED",
    "COURSE_GIFT_PAYMENT_BLOCKED",
    "COURSE_GIFT_SELF_PURCHASE",
    "UNKNOWN_PRIVATE_ERROR"
  ])("does not claim or navigate automatically for %s", (code) => {
    const props = recipientProps();
    const view = render(
      <CourseGiftRecipientPanel {...props} state={{ ...preview, code }} />
    );
    expect(view.queryByText("Claim course gift")).toBeNull();
    expect(view.getByText(recipientGiftMessage(code))).toBeTruthy();
    expect(props.onClaim).not.toHaveBeenCalled();
    expect(props.onRecheck).not.toHaveBeenCalled();
    expect(props.onSignIn).not.toHaveBeenCalled();
    expect(props.onOpenCourse).not.toHaveBeenCalled();
  });
  it("sign in is an explicit callback, not a claim or account switch", () => {
    const props = recipientProps();
    const view = render(
      <CourseGiftRecipientPanel {...props} state={{ ...preview, code: "SIGNED_OUT" }} />
    );
    fireEvent.press(view.getByText("Sign in to review gift"));
    expect(props.onSignIn).toHaveBeenCalledTimes(1);
    expect(props.onClaim).not.toHaveBeenCalled();
  });
  it.each(["2020-01-01T00:00:00.000Z", "invalid", ""])(
    "cannot claim with ended/unknown deadline %s",
    (claimExpiresAt) => {
      const view = render(
        <CourseGiftRecipientPanel
          {...recipientProps()}
          state={{ ...preview, claimExpiresAt }}
        />
      );
      expect(view.queryByText("Claim course gift")).toBeNull();
    }
  );
  it("shows only masked recipient data", () => {
    const view = render(
      <CourseGiftRecipientPanel
        {...recipientProps()}
        state={{ ...preview, recipient: "recipient@example.invalid" }}
      />
    );
    expect(view.getByText("Recipient: Recipient hidden")).toBeTruthy();
    expect(view.queryByText(/recipient@example.invalid/)).toBeNull();
    expect(maskedGiftRecipient("r***@example.invalid")).toBe("r***@example.invalid");
  });
  it("requires explicit single-flight claim and a bound successful reply before opening", async () => {
    const props = recipientProps();
    const pending = deferred<typeof claimed>();
    props.onClaim.mockReturnValue(pending.promise);
    const view = render(<CourseGiftRecipientPanel {...props} />);
    const button = view.getByText("Claim course gift");
    act(() => {
      fireEvent.press(button);
      fireEvent.press(button);
    });
    expect(props.onClaim).toHaveBeenCalledTimes(1);
    expect(view.queryByText("Open course")).toBeNull();
    await act(async () => {
      pending.resolve(claimed);
    });
    expect(view.getByText(/Course gift claimed/)).toBeTruthy();
    expect(props.onOpenCourse).not.toHaveBeenCalled();
    fireEvent.press(view.getByText("Open course"));
    expect(props.onOpenCourse).toHaveBeenCalledWith(preview.courseId);
  });
  it.each([
    { ...claimed, giftId: "wrong-gift" },
    { ...claimed, courseId: "wrong-course" },
    { ...claimed, enrollmentId: "" }
  ])("rejects unbound claim result %#", async (bad) => {
    const props = recipientProps();
    props.onClaim.mockResolvedValue(bad);
    const view = render(<CourseGiftRecipientPanel {...props} />);
    await press(view, "Claim course gift");
    expect(view.queryByText("Open course")).toBeNull();
    expect(view.queryByText("Claim course gift")).toBeNull();
    expect(view.getByText(/could not confirm the result/)).toBeTruthy();
  });
  it("recovers a lost claim by read only, without automatic claim replay", async () => {
    const props = recipientProps();
    props.onClaim.mockRejectedValue(new Error("private-token"));
    props.onRecheck.mockResolvedValue({
      ...preview,
      code: "COURSE_GIFT_ALREADY_CLAIMED"
    });
    const view = render(<CourseGiftRecipientPanel {...props} />);
    await press(view, "Claim course gift");
    expect(view.queryByText(/private-token/)).toBeNull();
    await press(view, "Check gift again");
    expect(props.onClaim).toHaveBeenCalledTimes(1);
    expect(view.getByText("Open course")).toBeTruthy();
    expect(props.onOpenCourse).not.toHaveBeenCalled();
  });
  it("rejects preview identity changes and removes stale successful access after read failure", async () => {
    const props = recipientProps();
    const view = render(<CourseGiftRecipientPanel {...props} />);
    await press(view, "Claim course gift");
    props.onRecheck.mockResolvedValue({ ...preview, giftId: "another-gift" });
    await press(view, "Check gift again");
    expect(view.queryByText("Open course")).toBeNull();
  });
  it("discards a previous session's late claim and never follows it", async () => {
    const props = recipientProps();
    const pending = deferred<typeof claimed>();
    props.onClaim.mockReturnValue(pending.promise);
    const view = render(<CourseGiftRecipientPanel {...props} />);
    fireEvent.press(view.getByText("Claim course gift"));
    view.rerender(
      <CourseGiftRecipientPanel
        {...props}
        scopeKey="synthetic-session-2"
        state={{ ...preview, code: "COURSE_GIFT_RECIPIENT_MISMATCH" }}
      />
    );
    await act(async () => {
      pending.resolve(claimed);
    });
    expect(view.queryByText("Open course")).toBeNull();
    expect(props.onOpenCourse).not.toHaveBeenCalled();
  });
  it.each(["day", "night"] as const)(
    "uses existing %s palette for fields and action text",
    (mode) => {
      mockTheme = mode;
      const view = render(<CourseGiftBuyerPanel {...buyerProps()} />);
      const palette = getThemePalette(mode, mode === "day" ? "light" : "dark");
      expect(
        StyleSheet.flatten(view.getByLabelText("Recipient email").props.style).color
      ).toBe(palette.text);
      expect(StyleSheet.flatten(view.getByText("Review gift").props.style).color).toBe(
        palette.accentText
      );
    }
  );
});
