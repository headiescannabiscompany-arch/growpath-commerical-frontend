import { validGiftMarket, sameGiftMarket } from "@/utils/courseGiftMarket";
import { validGiftSaleBody } from "@/api/courseGiftSaleContract";
const request = { courseId: "a".repeat(24), checkoutAttemptId: "a0000000-0000-4000-8000-000000000001", recipientEmail: "synthetic@example.invalid" };
describe("R09 launch country wire", () => {
  test.each([
    { buyerCountry: "US" }, { buyerCountry: "DE", recipientCountry: "de" },
    { buyerCountry: "US", recipientCountry: "GB" },
    { buyerCountry: "US", recipientCountry: "TH", approved: true }
  ])("rejects unbound or unsupported market fields: %j", (market) => {
    expect(validGiftMarket(market)).toBe(false);
    expect(validGiftSaleBody("buyerReview", { ...request, ...market })).toBe(false);
  });
  test("accepts a complete cross-country review and rejects country injection on checkout", () => {
    const market = { buyerCountry: "DE", recipientCountry: "TH" };
    expect(validGiftSaleBody("buyerReview", { ...request, ...market })).toBe(true);
    expect(validGiftSaleBody("buyerCheckout", { giftId: "b".repeat(24), ...market })).toBe(false);
  });
  test("legacy and declared market responses cannot substitute for one another", () => {
    const market = { buyerCountry: "DE", recipientCountry: "TH" } as const;
    expect(sameGiftMarket(undefined, undefined)).toBe(true);
    expect(sameGiftMarket(undefined, market)).toBe(false);
    expect(sameGiftMarket(market, undefined)).toBe(false);
    expect(sameGiftMarket(market, { ...market, recipientCountry: "US" })).toBe(false);
  });
});
