/**
 * Centralized entitlement logic shared between React context and tests.
 * Matches backend gating rules.
 */
export function getEntitlements(user) {
  if (!user) {
    return {
      isPro: false,
      isGuildMember: false,
      isEntitled: false,
      subscriptionStatus: "free"
    };
  }

  const subscriptionStatus = user.subscriptionStatus || "free";
  
  // Backend rule: Pro is active or trial
  // Note: Backend also checks expiry, but here we trust the status field 
  // returned by the specialized /status or /me endpoints.
  const isPro = subscriptionStatus === "active" || subscriptionStatus === "trial";
  
  const isGuildMember = Array.isArray(user.guilds) && user.guilds.length > 0;

  return {
    isPro,
    isGuildMember,
    subscriptionStatus,
    // Pro OR Guild Member unlocks AI/VPD
    isEntitled: isPro || isGuildMember
  };
}
