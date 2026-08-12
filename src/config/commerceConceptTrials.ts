import type { ImageSourcePropType } from "react-native";

export type PurchaseIntentConcept = {
  id: string;
  title: string;
  description: string;
  imageAlt: string;
  image: ImageSourcePropType;
  artworkApprovalStatus: "owner_approved" | "pending_owner_final_approval";
  rightsReviewStatus: "not_required" | "pending" | "approved";
};

export const purchaseIntentConcepts: PurchaseIntentConcept[] = [
  {
    id: "growpathai-hat-circuit-leaf-midnight-purchase-intent-trial",
    title: "GrowPathAI Circuit Leaf — Midnight",
    description: "Black structured hat concept with the reviewed Circuit Leaf artwork.",
    imageAlt:
      "GrowPathAI black structured hat concept sheet showing the front, sides, back, and embroidery details.",
    image: require("../../assets/brands/growpathai/hat-concepts/circuit-leaf-midnight-purchase-intent-trial.png"),
    artworkApprovalStatus: "owner_approved",
    rightsReviewStatus: "not_required"
  },
  {
    id: "growpathai-hat-circuit-leaf-sage-purchase-intent-trial",
    title: "GrowPathAI Circuit Leaf — Tonal Sage",
    description:
      "Tonal sage structured hat concept with a longer visor and small rear GrowPathAI wordmark.",
    imageAlt:
      "GrowPathAI tonal sage structured hat concept sheet showing the front, sides, back, and embroidery details.",
    image: require("../../assets/brands/growpathai/hat-concepts/circuit-leaf-sage-purchase-intent-trial.png"),
    artworkApprovalStatus: "owner_approved",
    rightsReviewStatus: "not_required"
  }
];

export function purchaseIntentConceptById(id: unknown) {
  const normalized = String(id || "").trim();
  return purchaseIntentConcepts.find((concept) => concept.id === normalized) || null;
}

export function publicPurchaseIntentConcepts() {
  return purchaseIntentConcepts.filter(
    (concept) =>
      concept.artworkApprovalStatus === "owner_approved" &&
      concept.rightsReviewStatus !== "pending"
  );
}
