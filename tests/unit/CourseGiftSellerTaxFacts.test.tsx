import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { CourseGiftSellerFactsForm, CourseGiftSellerFactsReview } from "@/components/courseGifts/CourseGiftSellerFacts";
import { giftCourseTaxCategories, giftTaxInclusivePriceStatement, parseGiftSellerFacts, type GiftCourseTaxCategory } from "@/utils/courseGiftSellerFacts";
import { createInternalCourseGiftSaleSession } from "@/utils/courseGiftSaleSession";
import { syntheticSellerFacts, syntheticTaxSellerFacts as facts } from "../fixtures/courseGiftSellerFacts";
jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return { ...actual, useAppTheme: () => ({ palette: actual.getThemePalette("night", "dark") }) };
});
const publication = "I authorize these seller and course details to be shown to prospective buyers and retained with their transaction evidence.";
const agency = "I appoint GrowPathAI to receive and timestamp withdrawal notices for this course on my behalf. I remain responsible for required remedies and deadlines.";
const form = (savedValue = facts()) => {
  const onEdit = jest.fn(), onReview = jest.fn();
  return { view: render(<CourseGiftSellerFactsForm savedValue={savedValue} disabled={false} onEdit={onEdit} onReview={onReview} />), onEdit, onReview };
};
describe("R09 creator tax declaration UI", () => {
  test.each(["recorded_streaming", "recorded_download", "written", "self_study", "live_virtual", "mixed_review"] as GiftCourseTaxCategory[])
  ("reviews %s with one format question and an explicit included-tax price", category => {
    const { view, onReview } = form(syntheticSellerFacts());
    expect(view.queryByLabelText("Course delivery: Prerecorded lessons")).toBeNull();
    expect(view.getAllByRole("radio").filter(v => v.props.accessibilityLabel.startsWith("Course delivery:"))).toHaveLength(6);
    fireEvent.press(view.getByLabelText(`Course delivery: ${giftCourseTaxCategories[category].label}`));
    expect(view.getByText(giftTaxInclusivePriceStatement)).toBeTruthy();
    fireEvent.press(view.getByLabelText(publication)); fireEvent.press(view.getByLabelText(agency));
    fireEvent.press(view.getByText("Review seller and course details"));
    expect(onReview).toHaveBeenCalledTimes(1);
    expect(parseGiftSellerFacts(onReview.mock.calls[0][0])).toMatchObject({ version: "course-gift-seller-facts-v2",
      courseTaxCategory: category, deliveryFormat: giftCourseTaxCategories[category].deliveryFormat, listedPriceTaxBehavior: "inclusive" });
  });
  test("written-material review stays accurate and does not expose a provider tax code", () => {
    const view = render(<CourseGiftSellerFactsReview value={facts({ courseTaxCategory: "written" })} />);
    expect(view.getByText("Delivery: Written course material — viewed or downloaded")).toBeTruthy();
    expect(view.queryByText("Delivery: Prerecorded lessons")).toBeNull();
    expect(view.getByText(giftTaxInclusivePriceStatement)).toBeTruthy();
    expect(JSON.stringify(view.toJSON())).not.toContain("txcd_");
    expect(view.getByText(/not a verification of legal identity/)).toBeTruthy();
  });
  test("saved v2 format is preserved but never prechecks renewed authority", () => {
    const { view, onReview } = form(facts({ courseTaxCategory: "live_virtual", deliveryFormat: "live" }));
    expect(view.getByLabelText("Course delivery: Live interactive virtual teaching — no replays").props.accessibilityState.checked).toBe(true);
    fireEvent.press(view.getByText("Review seller and course details")); expect(onReview).not.toHaveBeenCalled();
    expect(view.getByLabelText(publication).props.accessibilityState.checked).toBe(false);
    expect(view.getByLabelText(agency).props.accessibilityState.checked).toBe(false);
  });
  test("changing format invalidates disclosure and tells the parent to discard its review", () => {
    const { view, onEdit, onReview } = form();
    fireEvent.press(view.getByLabelText(publication)); fireEvent.press(view.getByLabelText(agency));
    onEdit.mockClear();
    fireEvent.press(view.getByLabelText("Course delivery: Mixed formats or unsure — needs review"));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(view.getByLabelText(publication).props.accessibilityState.checked).toBe(false);
    expect(view.getByLabelText(agency).props.accessibilityState.checked).toBe(false);
    fireEvent.press(view.getByText("Review seller and course details")); expect(onReview).not.toHaveBeenCalled();
  });
  test("wire display refuses invented, contradictory or unacknowledged tax choices", () => {
    const raw = JSON.parse(facts());
    for (const changes of [{ courseTaxCategory: "unknown" }, { listedPriceTaxBehavior: "exclusive" },
      { courseTaxCategory: "live_virtual", deliveryFormat: "recorded" }, { taxCodeCandidate: "txcd_00000000" }]) {
      const value = JSON.stringify({ ...raw, ...changes });
      expect(parseGiftSellerFacts(value)).toBeNull();
      expect(render(<CourseGiftSellerFactsReview value={value} />).toJSON()).toBeNull();
    }
    expect(parseGiftSellerFacts(syntheticSellerFacts())?.version).toBe("course-gift-seller-facts-v1");
  });
  test("a lost v2 consent save retains only its fingerprint and cannot retry a changed format", async () => {
    let hint: any = null;
    const client: any = {
      currentScope: () => "synthetic-scope",
      recoverSale: (_course: string, kind: string) => ({ state: kind === "creator" && hint ? "ready" : "empty", value: kind === "creator" ? hint : null }),
      rememberSale: jest.fn(v => { hint = JSON.parse(JSON.stringify(v)); return true; }), clearCreatorRecovery: () => true,
      dispose: jest.fn(),
      requestSale: jest.fn(async (_operation: string, body: Record<string, any>) => ({ courseId: "a".repeat(24), consent: null, canAccept: true, matchesPolicy: false,
        policy: { reference: "synthetic:policy", fingerprint: "b".repeat(64), version: "synthetic:v1", creatorTermsText: "Synthetic terms" },
        sellerFacts: body.sellerFacts, sellerFactsFingerprint: body.sellerFacts === facts() ? "c".repeat(64) : "d".repeat(64) }))
    };
    const session = createInternalCourseGiftSaleSession({ client, courseId: "a".repeat(24), attemptId: "a0000000-0000-4000-8000-000000000001", newRequestId: () => "b0000000-0000-4000-8000-000000000001" });
    await session.reviewCreator(facts()); client.requestSale.mockRejectedValueOnce(new Error("Lost synthetic response"));
    await expect(session.acceptCreator(true)).rejects.toThrow();
    expect(hint.sellerFactsFingerprint).toBe("c".repeat(64));
    expect(JSON.stringify(client.rememberSale.mock.calls)).not.toMatch(/Synthetic seller|seller@example.invalid|courseTaxCategory/);
    expect((await session.reviewCreator(facts({ courseTaxCategory: "recorded_download" }))).canAccept).toBe(false);
    await expect(session.acceptCreator(true)).rejects.toThrow();
    expect(client.requestSale.mock.calls.filter(([operation]: any) => operation === "creatorAccept")).toHaveLength(1);
    session.dispose();
  });
});
