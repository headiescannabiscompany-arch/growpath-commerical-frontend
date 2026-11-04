export type GiftSellerFacts = {
  version: "course-gift-seller-facts-v1";
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
const fields = ["version", "sellerName", "sellerAddress", "sellerEmail", "sellerPhone", "sellerRole", "deliveryFormat", "supportFormat", "assessment", "accessSummary", "publishToBuyers", "receiveWithdrawals"] as const;
const text = (v: unknown, max: number, multiline = false): v is string => typeof v === "string" &&
  v === v.trim() && v.length > 0 && v.length <= max &&
  !(multiline ? /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/ : /[\u0000-\u001f\u007f-\u009f]/).test(v);
export function encodeGiftSellerFacts(v: GiftSellerFacts): string {
  return JSON.stringify(Object.fromEntries(fields.map(k => [k, v[k]])));
}
// Server applies the existing course-content policy as well. This parser is a
// display/wire check, never identity, country/tax or consent authority.
export function parseGiftSellerFacts(value: unknown): GiftSellerFacts | null {
  if (typeof value !== "string" || value.length > 4500) return null;
  try {
    const v = JSON.parse(value);
    if (!v || Object.getPrototypeOf(v) !== Object.prototype || Object.keys(v).length !== fields.length ||
      !fields.every(k => Object.hasOwn(v, k)) || v.version !== "course-gift-seller-facts-v1" ||
      !text(v.sellerName, 200) || !text(v.sellerAddress, 600, true) || !text(v.sellerEmail, 320) ||
      v.sellerEmail !== v.sellerEmail.toLowerCase() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.sellerEmail) ||
      !text(v.sellerPhone, 60) || !["trader", "private"].includes(v.sellerRole) ||
      !["recorded", "live", "mixed"].includes(v.deliveryFormat) ||
      !["none", "group", "individual", "both"].includes(v.supportFormat) ||
      !["none", "automated", "instructor"].includes(v.assessment) || !text(v.accessSummary, 1000, true) ||
      v.publishToBuyers !== true || v.receiveWithdrawals !== true || encodeGiftSellerFacts(v) !== value) return null;
    return v;
  } catch { return null; }
}
export const giftFactLabels = {
  recorded: "Prerecorded lessons", live: "Live teaching", mixed: "Recorded and live teaching",
  none: "None", group: "Group support / Q&A", individual: "Individual support / Q&A", both: "Group and individual support / Q&A",
  automated: "Automated assignments / assessment", instructor: "Instructor-reviewed assignments / assessment",
  trader: "Selling as a business or sole proprietor", private: "Declares a private, non-business sale"
};
