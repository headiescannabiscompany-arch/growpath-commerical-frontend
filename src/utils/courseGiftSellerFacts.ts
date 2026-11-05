import taxCategories from "@/config/courseGiftTaxCategories.json";
export type GiftCourseTaxCategory = keyof typeof taxCategories.categories;
export const giftCourseTaxCategories = taxCategories.categories;
type GiftSellerFactsCommon = {
  sellerName: string;
  sellerAddress: string;
  sellerEmail: string;
  sellerPhone: string;
  sellerRole: "trader" | "private";
  deliveryFormat: "recorded" | "live" | "mixed";
  supportFormat: "none" | "group" | "individual" | "both";
  assessment: "none" | "automated" | "instructor";
  accessSummary: string;
  publishToBuyers: true;
  receiveWithdrawals: true;
};
export type GiftSellerFacts = GiftSellerFactsCommon & (
  { version: "course-gift-seller-facts-v1" } |
  { version: "course-gift-seller-facts-v2"; courseTaxCategory: GiftCourseTaxCategory; listedPriceTaxBehavior: "inclusive" }
);
const fields = ["version", "sellerName", "sellerAddress", "sellerEmail", "sellerPhone", "sellerRole", "deliveryFormat", "supportFormat", "assessment", "accessSummary", "publishToBuyers", "receiveWithdrawals"] as const;
const taxFields = [...fields, "courseTaxCategory", "listedPriceTaxBehavior"] as const;
const text = (v: unknown, max: number, multiline = false): v is string => typeof v === "string" &&
  v === v.trim() && v.length > 0 && v.length <= max &&
  !(multiline ? /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/ : /[\u0000-\u001f\u007f-\u009f]/).test(v);
export function encodeGiftSellerFacts(v: GiftSellerFacts): string {
  const keys = v.version === "course-gift-seller-facts-v2" ? taxFields : fields;
  return JSON.stringify(Object.fromEntries(keys.map(k => [k, (v as unknown as Record<string, unknown>)[k]])));
}
// Server applies the existing course-content policy as well. This parser is a
// display/wire check, never identity, country/tax or consent authority.
export function parseGiftSellerFacts(value: unknown): GiftSellerFacts | null {
  if (typeof value !== "string" || value.length > 4500) return null;
  try {
    const v = JSON.parse(value);
    const keys = v?.version === "course-gift-seller-facts-v2" ? taxFields : fields;
    if (!v || Object.getPrototypeOf(v) !== Object.prototype || Object.keys(v).length !== keys.length ||
      !keys.every(k => Object.hasOwn(v, k)) || !["course-gift-seller-facts-v1", "course-gift-seller-facts-v2"].includes(v.version) ||
      !text(v.sellerName, 200) || !text(v.sellerAddress, 600, true) || !text(v.sellerEmail, 320) ||
      v.sellerEmail !== v.sellerEmail.toLowerCase() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.sellerEmail) ||
      !text(v.sellerPhone, 60) || !["trader", "private"].includes(v.sellerRole) ||
      !["recorded", "live", "mixed"].includes(v.deliveryFormat) ||
      !["none", "group", "individual", "both"].includes(v.supportFormat) ||
      !["none", "automated", "instructor"].includes(v.assessment) || !text(v.accessSummary, 1000, true) ||
      v.publishToBuyers !== true || v.receiveWithdrawals !== true || encodeGiftSellerFacts(v) !== value) return null;
    if (v.version === "course-gift-seller-facts-v2" &&
      (!Object.hasOwn(giftCourseTaxCategories, v.courseTaxCategory) ||
        giftCourseTaxCategories[v.courseTaxCategory as GiftCourseTaxCategory].deliveryFormat !== v.deliveryFormat ||
        v.listedPriceTaxBehavior !== taxCategories.pricingTaxBehavior)) return null;
    return v;
  } catch { return null; }
}
export const giftTaxInclusivePriceStatement = "The listed gift price includes applicable tax. Tax is deducted from that price before the creator's proceeds are paid, together with the existing platform fee. This does not change the fee rate.";
export function giftCourseDeliveryLabel(facts: GiftSellerFacts): string {
  return facts.version === "course-gift-seller-facts-v2"
    ? giftCourseTaxCategories[facts.courseTaxCategory].label
    : giftFactLabels[facts.deliveryFormat];
}
export const giftFactLabels = {
  recorded: "Prerecorded lessons", live: "Live teaching", mixed: "Recorded and live teaching",
  none: "None", group: "Group support / Q&A", individual: "Individual support / Q&A", both: "Group and individual support / Q&A",
  automated: "Automated assignments / assessment", instructor: "Instructor-reviewed assignments / assessment",
  trader: "Selling as a business or sole proprietor", private: "Declares a private, non-business sale"
};
