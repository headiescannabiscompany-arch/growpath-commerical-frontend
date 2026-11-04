export const giftMarketCountries = ["US", "DE", "TH"] as const;
export type GiftMarketCountry = (typeof giftMarketCountries)[number];
export type GiftMarket = { buyerCountry: GiftMarketCountry; recipientCountry: GiftMarketCountry };
export const giftMarketLabel: Record<GiftMarketCountry, string> = {
  US: "United States", DE: "Germany", TH: "Thailand"
};
export function validGiftMarketCountry(value: unknown): value is GiftMarketCountry {
  return typeof value === "string" && giftMarketCountries.some((country) => country === value);
}
export function validGiftMarket(value: unknown): value is GiftMarket {
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const v = value as Record<string, unknown>;
  return Object.keys(v).length === 2 && Object.hasOwn(v, "buyerCountry") &&
    Object.hasOwn(v, "recipientCountry") && validGiftMarketCountry(v.buyerCountry) &&
    validGiftMarketCountry(v.recipientCountry);
}
export function sameGiftMarket(left: GiftMarket | undefined, right: GiftMarket | undefined) {
  return left === undefined ? right === undefined : validGiftMarket(left) && validGiftMarket(right) &&
    left.buyerCountry === right.buyerCountry && left.recipientCountry === right.recipientCountry;
}
