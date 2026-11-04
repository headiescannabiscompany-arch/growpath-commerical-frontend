import { encodeGiftSellerFacts, type GiftSellerFacts } from "@/utils/courseGiftSellerFacts";
export const syntheticSellerFacts = (changes: Partial<GiftSellerFacts> = {}) => encodeGiftSellerFacts({
  version: "course-gift-seller-facts-v1", sellerName: "Synthetic seller",
  sellerAddress: "1 Synthetic Street\nTest Town, United States", sellerEmail: "seller@example.invalid",
  sellerPhone: "+1 202 555 0100", sellerRole: "trader", deliveryFormat: "recorded", supportFormat: "group",
  assessment: "none", accessSummary: "Prerecorded gardening lessons, twelve months access. Weekly group Q&A.",
  publishToBuyers: true, receiveWithdrawals: true, ...changes
});
