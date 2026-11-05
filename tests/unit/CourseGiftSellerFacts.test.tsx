import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { CourseGiftSellerFactsForm, CourseGiftSellerFactsReview } from "@/components/courseGifts/CourseGiftSellerFacts";
import { parseGiftSellerFacts } from "@/utils/courseGiftSellerFacts";
import { createInternalCourseGiftSaleSession } from "@/utils/courseGiftSaleSession";
import { validGiftSaleBody } from "@/api/courseGiftSaleContract";
import { validGiftSaleRecovery } from "@/utils/courseGiftSaleRecovery";
import { syntheticSellerFacts as facts, syntheticTaxSellerFacts as taxFacts } from "../fixtures/courseGiftSellerFacts";
jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return { ...actual, useAppTheme: () => ({ palette: actual.getThemePalette("night", "dark") }) };
});
const COURSE = "a".repeat(24), UUID = "a0000000-0000-4000-8000-000000000001", HASH = "b".repeat(64);
const publication = "I authorize these seller and course details to be shown to prospective buyers and retained with their transaction evidence.";
const agency = "I appoint GrowPathAI to receive and timestamp withdrawal notices for this course on my behalf. I remain responsible for required remedies and deadlines.";
const policy = { reference: "synthetic:policy", fingerprint: HASH, version: "synthetic:v1", creatorTermsText: "Synthetic terms" };
const review = () => ({ courseId: COURSE, policy, consent: null, canAccept: true, matchesPolicy: false });
let hint: any, client: any, session: ReturnType<typeof createInternalCourseGiftSaleSession>;
beforeEach(() => {
  hint = null;
  client = {
    currentScope: jest.fn(() => "synthetic-scope"),
    recoverSale: jest.fn((_course, kind) => ({ state: kind === "creator" && hint ? "ready" : "empty", value: kind === "creator" ? hint : null })),
    rememberSale: jest.fn(v => { hint = JSON.parse(JSON.stringify(v)); return true; }),
    clearCreatorRecovery: jest.fn(() => { hint = null; return true; }),
    requestSale: jest.fn(async (operation, body) => operation === "creatorReview"
      ? { ...review(), ...(body.sellerFacts ? { sellerFacts: body.sellerFacts, sellerFactsFingerprint: body.sellerFacts === facts() ? HASH : "c".repeat(64) } : {}) }
      : { reference: "synthetic:consent", revision: 1, enabled: true, revokedAt: null, replayed: false })
  };
  session = createInternalCourseGiftSaleSession({ client, courseId: COURSE, attemptId: UUID, newRequestId: () => UUID });
});
function form(savedValue?: string) {
  const onEdit = jest.fn(), onReview = jest.fn();
  return { view: render(<CourseGiftSellerFactsForm savedValue={savedValue} disabled={false} onEdit={onEdit} onReview={onReview} />), onEdit, onReview };
}
test("creator form has no inferred status or implicit publication/agency authority", () => {
  const { view, onReview } = form();
  expect(view.getByLabelText("Seller status: Selling as a business or sole proprietor").props.accessibilityState.checked).toBe(false);
  expect(view.getByLabelText(publication).props.accessibilityState.checked).toBe(false);
  expect(view.getByLabelText(agency).props.accessibilityState.checked).toBe(false);
  fireEvent.press(view.getByText("Review seller and course details")); expect(onReview).not.toHaveBeenCalled();
});
test("saved facts prefill without inferring the new format and require renewed authority", () => {
  const { view, onReview } = form(facts());
  expect(view.getByDisplayValue("Synthetic seller")).toBeTruthy();
  fireEvent.press(view.getByLabelText(publication)); fireEvent.press(view.getByText("Review seller and course details"));
  expect(onReview).not.toHaveBeenCalled();
  fireEvent.press(view.getByLabelText(agency)); fireEvent.press(view.getByText("Review seller and course details"));
  expect(onReview).not.toHaveBeenCalled();
  fireEvent.press(view.getByLabelText("Course delivery: Prerecorded audio/video — streaming only"));
  expect(view.getByLabelText(publication).props.accessibilityState.checked).toBe(false);
  fireEvent.press(view.getByLabelText(publication)); fireEvent.press(view.getByLabelText(agency));
  fireEvent.press(view.getByText("Review seller and course details"));
  expect(onReview).toHaveBeenCalledWith(taxFacts());
});
test("editing a reviewed contact clears authority and informs the parent to invalidate terms", () => {
  const { view, onReview, onEdit } = form(facts());
  fireEvent.press(view.getByLabelText(publication)); fireEvent.press(view.getByLabelText(agency));
  fireEvent.changeText(view.getByDisplayValue("Synthetic seller"), "Other synthetic seller");
  expect(view.getByLabelText(publication).props.accessibilityState.checked).toBe(false);
  expect(view.getByLabelText(agency).props.accessibilityState.checked).toBe(false); expect(onEdit).toHaveBeenCalledTimes(3);
  fireEvent.press(view.getByText("Review seller and course details")); expect(onReview).not.toHaveBeenCalled();
});
test("buyer review displays authorized contacts and course facts as seller-provided", () => {
  const view = render(<CourseGiftSellerFactsReview value={facts()} />);
  expect(view.getByText("Seller: Synthetic seller")).toBeTruthy();
  expect(view.getByText(/1 Synthetic Street/)).toBeTruthy(); expect(view.getByText(/seller@example.invalid/)).toBeTruthy();
  expect(view.getByText("Delivery: Prerecorded lessons")).toBeTruthy(); expect(view.getByText(/not a verification/)).toBeTruthy();
});
test.each([facts({ sellerEmail: "invalid" }), facts({ sellerName: "x".repeat(201) }),
  JSON.stringify({ ...JSON.parse(facts()), stripeIdentity: "PRIVATE" }), facts().replace('"publishToBuyers":true', '"publishToBuyers":false')])("refuses malformed or unconsented facts: %#", value => {
  expect(parseGiftSellerFacts(value)).toBeNull(); expect(render(<CourseGiftSellerFactsReview value={value} />).toJSON()).toBeNull();
});
test("wire requires a complete creator declaration pair and refuses buyer injection", () => {
  expect(validGiftSaleBody("creatorReview", { courseId: COURSE, sellerFacts: facts() })).toBe(true);
  const body = { courseId: COURSE, requestId: UUID, policyReference: policy.reference, policyFingerprint: HASH, expectedConsentRef: null, accepted: true, sellerFacts: facts() };
  expect(validGiftSaleBody("creatorAccept", body)).toBe(false);
  expect(validGiftSaleBody("creatorAccept", { ...body, sellerFactsFingerprint: HASH })).toBe(true);
  expect(validGiftSaleBody("buyerCheckout", { giftId: COURSE, sellerFacts: facts() })).toBe(false);
});
test("session binds reviewed facts but stores only an opaque fingerprint for recovery", async () => {
  await session.reviewCreator(facts()); await session.acceptCreator(true);
  expect(client.requestSale.mock.calls.at(-1)[1]).toMatchObject({ sellerFacts: facts(), sellerFactsFingerprint: HASH });
  const saved = JSON.stringify(client.rememberSale.mock.calls);
  for (const contact of ["Synthetic seller", "Synthetic Street", "seller@example.invalid", "+1 202"]) expect(saved).not.toContain(contact);
  expect(client.rememberSale.mock.calls[0][0].sellerFactsFingerprint).toBe(HASH);
});
test("lost save requires explicit same-declaration review and preserves request ID", async () => {
  await session.reviewCreator(facts()); client.requestSale.mockRejectedValueOnce(new Error("Lost response"));
  await expect(session.acceptCreator(true)).rejects.toThrow();
  await expect(session.acceptCreator(true)).rejects.toThrow();
  await session.reviewCreator(facts()); await session.acceptCreator(true);
  const saves = client.requestSale.mock.calls.filter(([op]: any) => op === "creatorAccept");
  expect(saves.map(([, body]: any) => body.requestId)).toEqual([UUID, UUID]);
});
test("changed declaration cannot replace an unresolved request", async () => {
  await session.reviewCreator(facts()); client.requestSale.mockRejectedValueOnce(new Error("Lost response"));
  await expect(session.acceptCreator(true)).rejects.toThrow();
  const next = await session.reviewCreator(facts({ sellerName: "Different seller" })); expect(next.canAccept).toBe(false);
  await expect(session.acceptCreator(true)).rejects.toThrow();
  expect(client.requestSale.mock.calls.filter(([op]: any) => op === "creatorAccept")).toHaveLength(1);
});
test("server reply cannot substitute different facts in a preview", async () => {
  client.requestSale.mockResolvedValueOnce({ ...review(), sellerFacts: facts({ sellerName: "Different seller" }), sellerFactsFingerprint: HASH });
  await expect(session.reviewCreator(facts())).rejects.toThrow(); await expect(session.acceptCreator(true)).rejects.toThrow();
});
test("recovery remains compatible with legacy hints and refuses contact fields", () => {
  const old = { kind: "creator", courseId: COURSE, requestId: UUID, policyReference: policy.reference, policyFingerprint: HASH, expectedConsentRef: null };
  expect(validGiftSaleRecovery(old)).toBe(true); expect(validGiftSaleRecovery({ ...old, sellerFactsFingerprint: HASH })).toBe(true);
  expect(validGiftSaleRecovery({ ...old, sellerFacts: facts() })).toBe(false);
});
test("buyer session carries the reviewed declaration into display without writing contact recovery", async () => {
  client.requestSale.mockResolvedValueOnce({
    version: "course-gift-sale-review-v1", courseId: COURSE, checkoutAttemptId: UUID, recipientEmail: "learner@example.invalid",
    reviewFingerprint: HASH, title: "Synthetic course", amountCents: 2500, currency: "usd", sellerFacts: facts(),
    terms: { version: "synthetic:v1", expiry: "Synthetic expiry", duplicateAccess: "Synthetic duplicate", courseUnavailable: "Synthetic unavailable", refund: "Synthetic refund" }
  });
  const quote = await session.reviewBuyer("learner@example.invalid");
  expect(quote.sellerFacts).toBe(facts()); expect(quote.amountCents).toBe(2500); expect(client.rememberSale).not.toHaveBeenCalled();
});
