/**
 * Centralized entitlement logic shared between React context and tests.
 * Matches backend gating rules.
 */
export function getEntitlements(user) {
  if (!user) {
    return {
      isPro: false,
      isProCommercial: false,
      isFacility: false,
      isCommercial: false,
      isGuildMember: false,
      isEntitled: false,
      subscriptionStatus: "free"
    };
  }

  const subscriptionStatus = user.subscriptionStatus || "free";
  // You may want to use user.subscriptionType or similar if available
  // Example: user.subscriptionType = "pro", "pro_commercial", "facility", "commercial"
  const subscriptionType = user.subscriptionType || "free";

  // Single-user Pro: $10/mo
  const isPro =
    (subscriptionType === "pro" || subscriptionType === "pro_commercial") &&
    (subscriptionStatus === "active" || subscriptionStatus === "trial");
  // Single-user Pro+Commercial: $25/mo
  const isProCommercial =
    subscriptionType === "pro_commercial" &&
    (subscriptionStatus === "active" || subscriptionStatus === "trial");
  // Facility: $50/mo
  const isFacility =
    subscriptionType === "facility" &&
    (subscriptionStatus === "active" || subscriptionStatus === "trial");
  // Commercial: $50/mo
  const isCommercial =
    subscriptionType === "commercial" &&
    (subscriptionStatus === "active" || subscriptionStatus === "trial");

  const isGuildMember = Array.isArray(user.guilds) && user.guilds.length > 0;

  // Pro OR Guild Member unlocks AI/VPD
  const isEntitled =
    isPro || isProCommercial || isFacility || isCommercial || isGuildMember;

  // For mode gating
  const facilityAccess = isFacility;
  const commercialAccess = isCommercial || isProCommercial;

  return {
    isPro,
    isProCommercial,
    isFacility,
    isCommercial,
    isGuildMember,
    isEntitled,
    subscriptionStatus,
    facilityAccess,
    commercialAccess
  };
}
