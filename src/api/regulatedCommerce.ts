import { apiRequest } from "./apiRequest";

export type RegulatedAuthorization = {
  id?: string;
  _id?: string;
  businessRoles: string[];
  productClasses: string[];
  jurisdiction: {
    countryCode: string;
    subdivisionCode?: string;
    locality?: string;
  };
  authorizationType: string;
  authorizationIdentifier: string;
  issuer: string;
  evidenceUrl?: string;
  effectiveAt?: string | null;
  expiresAt?: string | null;
  reviewStatus: "pending" | "verified" | "rejected" | "expired" | "revoked";
  reviewNotes?: string;
};

export type RegulatedDecision = {
  id?: string;
  _id?: string;
  policyVersion: string;
  capability: string;
  productClass: string;
  origin: { countryCode: string; subdivisionCode?: string };
  destination: { countryCode: string; subdivisionCode?: string };
  buyerEligibility: string;
  fulfillmentMethod: string;
  decision: "allowed" | "denied" | "review_required";
  reasonCodes: string[];
  effectiveAt?: string | null;
  expiresAt?: string | null;
};

export type RegulatedCommerceWorkspace = {
  storefront: { id: string; name: string; slug?: string };
  businessRoles: string[];
  productClasses: string[];
  authorizations: RegulatedAuthorization[];
  decisions: RegulatedDecision[];
  policy: string;
};

export async function fetchRegulatedCommerce(): Promise<RegulatedCommerceWorkspace> {
  return apiRequest("/api/commercial/regulated-commerce");
}

export async function submitRegulatedAuthorization(
  data: Omit<RegulatedAuthorization, "id" | "_id" | "reviewStatus" | "reviewNotes">
) {
  return apiRequest("/api/commercial/regulated-commerce/authorizations", {
    method: "POST",
    body: data
  });
}
