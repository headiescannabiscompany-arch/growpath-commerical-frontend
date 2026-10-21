import React from "react";
import { Platform } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import {
  CourseGiftBuyerPanel,
  CourseGiftRecipientPanel
} from "@/components/courseGifts/CourseGiftPanels";
import { InternalCourseGiftSaleScreen } from "@/components/courseGifts/CourseGiftSaleScreens";
import CourseGiftWebScreen, {
  InternalCourseGiftWebContext
} from "@/components/courseGifts/CourseGiftWebScreen";
import {
  giftClaimTiming,
  type GiftQuote,
  type GiftRecipientState
} from "@/components/courseGifts/courseGiftPresentation";

jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({ palette: actual.getThemePalette("night", "dark") })
  };
});
jest.mock("@/api/courseGiftHttp", () => ({
  createInternalCourseGiftHttpClient: () => {
    throw new Error("No transport in copy checks");
  }
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), setParams: jest.fn() }),
  usePathname: () => "/claim-course-gift",
  useGlobalSearchParams: () => ({}),
  useNavigationContainerRef: () => ({
    isReady: () => true,
    addListener: () => () => undefined
  })
}));

const support = "For gift support, contact support@growpathai.com.";
const buyerCopy =
  "You’re buying this course for the email address shown. The recipient must sign in with that verified address and claim it. This does not enroll you or change either person’s subscription, AI credits, or access to other features.";
const withdrawalCopy =
  "Withdrawing gift consent stops new eligible gift sales. It does not erase existing payments, delivery obligations, recipient rights or financial records.";
const quote: GiftQuote = {
  courseId: "synthetic-course",
  title: "Synthetic course",
  amountCents: 2500,
  currency: "usd",
  checkoutAttemptId: "synthetic-attempt",
  terms: {
    version: "synthetic-original-version",
    expiry: "Original saved timing terms",
    duplicateAccess: "Original saved duplicate terms",
    courseUnavailable: "Original saved availability terms",
    refund: "Original saved refund terms"
  }
};
const preview: GiftRecipientState = {
  giftId: "synthetic-gift",
  courseId: quote.courseId,
  courseTitle: quote.title,
  recipient: "r***@example.invalid",
  claimExpiresAt: "2099-01-01T00:00:00.000Z",
  claimExpiryMode: "none",
  inactivityFeeCents: 0,
  code: "COURSE_GIFT_TRANSACTION_REQUIRED"
};
let fetchGuard: jest.SpyInstance;
beforeEach(() => {
  jest.replaceProperty(Platform, "OS", "web");
  fetchGuard = jest.spyOn(global, "fetch").mockImplementation(() => {
    throw new Error("Network forbidden in approved-copy checks");
  });
});
afterEach(() => {
  expect(fetchGuard).not.toHaveBeenCalled();
  fetchGuard.mockRestore();
});

test("approved buyer copy covers other features without replacing saved terms or accepting consent", () => {
  const before = JSON.stringify(quote);
  const onCheckout = jest.fn();
  const onRefresh = jest.fn();
  const view = render(
    <CourseGiftBuyerPanel
      scopeKey="synthetic-copy"
      availability="ready"
      quote={quote}
      reviewedRecipient="recipient@example.invalid"
      onCheckout={onCheckout}
      onRefresh={onRefresh}
    />
  );
  expect(view.getByText(buyerCopy)).toBeTruthy();
  expect(view.getByText(support)).toBeTruthy();
  expect(view.getByText(`Claim window: ${quote.terms.expiry}`)).toBeTruthy();
  expect(view.getByText(`Existing access: ${quote.terms.duplicateAccess}`)).toBeTruthy();
  expect(
    view.getByText(`Course availability: ${quote.terms.courseUnavailable}`)
  ).toBeTruthy();
  expect(view.getByText(`Refunds: ${quote.terms.refund}`)).toBeTruthy();
  expect(
    view.getByLabelText("I reviewed the recipient and gift terms").props
      .accessibilityState.checked
  ).toBe(false);
  expect(onCheckout).not.toHaveBeenCalled();
  expect(onRefresh).not.toHaveBeenCalled();
  expect(JSON.stringify(quote)).toBe(before);
  view.unmount();
});

function recipient() {
  const onClaim = jest.fn().mockResolvedValue({
    action: "claimed",
    giftId: preview.giftId,
    courseId: preview.courseId,
    enrollmentId: "synthetic-enrollment"
  });
  const onRecheck = jest.fn();
  const onOpenCourse = jest.fn();
  const view = render(
    <CourseGiftRecipientPanel
      scopeKey="synthetic-copy"
      state={preview}
      onClaim={onClaim}
      onRecheck={onRecheck}
      onSignIn={jest.fn()}
      onOpenCourse={onOpenCourse}
    />
  );
  return { view, onClaim, onRecheck, onOpenCourse };
}

test("recipient request copy includes other features without a claim on mount", () => {
  const { view, onClaim, onRecheck } = recipient();
  expect(
    view.getByText(
      "Choose Claim course gift to request access. Your subscription, AI credits, and access to other features stay unchanged."
    )
  ).toBeTruthy();
  expect(onClaim).not.toHaveBeenCalled();
  expect(onRecheck).not.toHaveBeenCalled();
  view.unmount();
});

test("claimed copy retains other-feature assurance after the explicit mocked claim", async () => {
  const { view, onClaim, onOpenCourse } = recipient();
  await act(async () => fireEvent.press(view.getByText("Claim course gift")));
  expect(
    view.getByText(
      "Course gift claimed. Your subscription, AI credits, and access to other features are unchanged."
    )
  ).toBeTruthy();
  expect(onClaim).toHaveBeenCalledTimes(1);
  expect(onOpenCourse).not.toHaveBeenCalled();
  view.unmount();
});

test("creator copy explains withdrawal while retaining the server terms and unchecked action", async () => {
  const reviewCreator = jest.fn().mockResolvedValue({
    consent: { enabled: true },
    matchesPolicy: true,
    canAccept: false,
    policy: {
      version: "synthetic-original-version",
      creatorTermsText: "Original saved creator terms"
    }
  });
  const acceptCreator = jest.fn();
  const revokeCreator = jest.fn();
  const session = {
    scope: "synthetic-copy",
    courseId: quote.courseId,
    attemptId: quote.checkoutAttemptId,
    assertCurrent: jest.fn(),
    recovery: () => ({}),
    reviewCreator,
    acceptCreator,
    revokeCreator
  } as unknown as React.ComponentProps<typeof InternalCourseGiftSaleScreen>["session"];
  const view = render(
    <InternalCourseGiftSaleScreen
      mode="creator"
      session={session}
      onNavigateToCheckout={jest.fn()}
    />
  );
  expect(
    view.getByText(
      /payments, connect payouts or change your subscription, AI credits, or access to other features/
    )
  ).toBeTruthy();
  expect(view.getByText(support)).toBeTruthy();
  expect(reviewCreator).not.toHaveBeenCalled();
  await act(async () =>
    fireEvent.press(view.getByText("Review current gift permission"))
  );
  expect(view.getByText(withdrawalCopy)).toBeTruthy();
  expect(view.getByText("Original saved creator terms")).toBeTruthy();
  expect(
    view.getByLabelText("I want to revoke gift consent for this course").props
      .accessibilityState.checked
  ).toBe(false);
  expect(acceptCreator).not.toHaveBeenCalled();
  expect(revokeCreator).not.toHaveBeenCalled();
  view.unmount();
});

test.each(["claim", "checkout"] as const)(
  "%s status copy includes other features and support without reading or claiming",
  (kind) => {
    const reviewRecipient = jest.fn();
    const readBuyerStatus = jest.fn();
    const context = {
      session: { reviewRecipient, readBuyerStatus },
      snapshot: {
        key: "synthetic-copy",
        path: kind === "claim" ? "/claim-course-gift" : "/course-gifts/checkout",
        kind,
        authState: "ready",
        hasInvitation: true,
        attempt: quote.checkoutAttemptId
      }
    } as unknown as NonNullable<React.ContextType<typeof InternalCourseGiftWebContext>>;
    const view = render(
      <InternalCourseGiftWebContext.Provider value={context}>
        <CourseGiftWebScreen />
      </InternalCourseGiftWebContext.Provider>
    );
    expect(
      view.getByText(
        "This gift does not change your subscription, AI credits, or access to other features. Returning here does not confirm payment, email delivery or course access."
      )
    ).toBeTruthy();
    expect(view.getByText(support)).toBeTruthy();
    expect(reviewRecipient).not.toHaveBeenCalled();
    expect(readBuyerStatus).not.toHaveBeenCalled();
    view.unmount();
  }
);

test("approved no-expiry copy is conditional and leaves legacy timing text unchanged", () => {
  const before = JSON.stringify(preview);
  expect(giftClaimTiming(preview)).toBe(
    `This gift has no automatic claim expiry or inactivity fees. Security links expire separately; an expired link does not cancel the gift. Security link expires (UTC): ${preview.claimExpiresAt}. Contact support@growpathai.com for manual review.`
  );
  const legacy = { ...preview };
  delete legacy.claimExpiryMode;
  delete legacy.inactivityFeeCents;
  expect(giftClaimTiming(legacy)).toBe(`Claim by (UTC): ${legacy.claimExpiresAt}`);
  expect(JSON.stringify(preview)).toBe(before);
});
