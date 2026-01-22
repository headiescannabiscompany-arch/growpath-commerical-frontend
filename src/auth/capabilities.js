// src/auth/capabilities.js
// Centralized capability resolver for user roles/modes/plans

export function buildCaps(user) {
  const mode = user?.mode || "personal"; // "personal" | "commercial" | "facility"
  const plan = user?.plan || (user?.isPro ? "pro" : "free");
  const facilityRole = user?.facilityRole || null; // "OWNER" | "MANAGER" | "STAFF" | ...

  const isAdmin = !!user?.isAdmin;
  const isPro = plan === "pro" || plan === "commercial" || plan === "facility";
  const isCommercial = mode === "commercial" || plan === "commercial";
  const isFacility = mode === "facility" || plan === "facility";

  return {
    mode,
    plan,
    facilityRole,
    isAdmin,
    // core
    canUseGrows: mode === "personal" || isAdmin,
    canUseCommunity: true,
    canUseLearning: true,
    // tasks/notifications
    canUseTasks: true,
    canUseTemplates: isPro || isCommercial || isFacility,
    // commercial/facility ops
    canUseReports: isPro || isCommercial || isFacility,
    canUseCompliance: isCommercial || isFacility || isAdmin,
    canUseMetrc: isFacility || isAdmin,
    // management
    canManageFacility:
      isFacility && (facilityRole === "OWNER" || facilityRole === "MANAGER")
  };
}
