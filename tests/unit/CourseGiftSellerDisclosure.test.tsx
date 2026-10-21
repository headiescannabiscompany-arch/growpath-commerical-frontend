import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { CourseGiftBuyerPanel } from "@/components/courseGifts/CourseGiftPanels";
import { validGiftSaleQuote, type GiftSaleQuote } from "@/api/courseGiftSaleContract";
import TermsPage from "@/app/terms";
jest.mock("@/components/PublicInfoPage", () => () => null);
jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({ palette: actual.getThemePalette("night", "dark") })
  };
});
const quote = (): GiftSaleQuote => ({
  version: "course-gift-sale-review-v1",
  courseId: "a".repeat(24),
  checkoutAttemptId: "a0000000-0000-4000-8000-000000000001",
  recipientEmail: "learner@example.invalid",
  reviewFingerprint: "b".repeat(64),
  title: "Synthetic course",
  amountCents: 2500,
  currency: "usd",
  sellerDisclosure: {
    source: "published_creator_profile",
    displayName: "Synthetic teacher"
  },
  terms: {
    version: "synthetic:v1",
    expiry: "Saved expiry",
    duplicateAccess: "Saved duplicate",
    courseUnavailable: "Saved availability",
    refund: "Saved refund"
  }
});
const panel = (q: GiftSaleQuote, onCheckout = jest.fn()) => (
  <CourseGiftBuyerPanel
    scopeKey="synthetic"
    availability="ready"
    quote={q}
    reviewedRecipient={q.recipientEmail}
    onCheckout={onCheckout}
    onRefresh={jest.fn()}
  />
);
describe("seller disclosure buyer copy", () => {
  test("shows published name, marketplace roles and legal-identity limitation without acting", () => {
    const q = quote(),
      before = JSON.stringify(q),
      checkout = jest.fn();
    const view = render(panel(q, checkout));
    expect(view.getByText("Course creator: Synthetic teacher")).toBeTruthy();
    expect(
      view.getByText(
        "Independent creators sell their own courses through GrowPathAI. GrowPathAI hosts the marketplace and sells its own courses and subscriptions."
      )
    ).toBeTruthy();
    expect(
      view.getByText(/A public profile name is not verified legal seller information/)
    ).toBeTruthy();
    expect(
      view.getByText(/Verified seller details are not available in this review/)
    ).toBeTruthy();
    expect(
      view.getByLabelText("I reviewed the recipient and gift terms").props
        .accessibilityState.checked
    ).toBe(false);
    expect(checkout).not.toHaveBeenCalled();
    expect(JSON.stringify(q)).toBe(before);
  });
  test.each([null, undefined])(
    "missing public name stays explicit (%s)",
    (disclosure) => {
      const view = render(panel({ ...quote(), sellerDisclosure: disclosure }));
      expect(
        view.getByText("Course creator: public profile name unavailable.")
      ).toBeTruthy();
      expect(view.getByText(/Verified seller details are not available/)).toBeTruthy();
    }
  );
  test("a changed displayed name resets the existing unchecked review boundary", () => {
    const q = quote();
    const view = render(panel(q));
    fireEvent.press(view.getByLabelText("I reviewed the recipient and gift terms"));
    expect(
      view.getByLabelText("I reviewed the recipient and gift terms").props
        .accessibilityState.checked
    ).toBe(true);
    view.rerender(
      panel({
        ...q,
        sellerDisclosure: {
          source: "published_creator_profile",
          displayName: "Updated teacher"
        },
        reviewFingerprint: "c".repeat(64)
      })
    );
    expect(view.getByText("Course creator: Updated teacher")).toBeTruthy();
    expect(
      view.getByLabelText("I reviewed the recipient and gift terms").props
        .accessibilityState.checked
    ).toBe(false);
  });
  test.each([
    { source: "account", displayName: "Private identity" },
    {
      source: "published_creator_profile",
      displayName: "Name",
      email: "private@example.invalid"
    },
    { source: "published_creator_profile", displayName: "Name", verified: true },
    { source: "published_creator_profile", displayName: " " },
    { source: "published_creator_profile", displayName: "x".repeat(81) },
    { source: "published_creator_profile", displayName: "bad\nname" }
  ])("rejects malformed or expanded identity %j", (sellerDisclosure) => {
    const q = { ...quote(), sellerDisclosure };
    expect(validGiftSaleQuote(q, q.courseId, q.checkoutAttemptId, q.recipientEmail)).toBe(
      false
    );
  });
  test("Terms state the approved business roles without waiving customer remedies", () => {
    const props = TermsPage().props;
    const section = props.sections.find(
      (s: { title: string }) => s.title === "Who Sells Courses"
    );
    expect(section.body).toContain(
      "Independent creators sell their own courses through GrowPathAI."
    );
    expect(section.body).toContain(
      "GrowPathAI hosts the marketplace and sells its own courses and subscriptions."
    );
    expect(section.body).toContain("not verified legal seller information");
    expect(section.body).toContain("support@growpathai.com");
    expect(section.body).toContain(
      "does not limit any refund, cancellation or other remedy required by applicable law"
    );
    expect(section.body).not.toMatch(/no liability|Stripe.approved|merchant of record/i);
    expect(props.updated).toBe("October 21, 2026");
  });
});
