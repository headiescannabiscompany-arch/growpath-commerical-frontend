// Central entitlement utility for GrowPath roles and features

// User roles
export const ROLES = {
  FREE: "free",
  PRO: "pro",
  INFLUENCER: "influencer",
  COMMERCIAL: "commercial",
  FACILITY: "facility"
};

// Features (add more as needed)
export const FEATURES = {
  DASHBOARD_ANALYTICS: "dashboard_analytics",
  DASHBOARD_EXPORT: "dashboard_export",
  GROWLOGS_MULTI: "growlogs_multi",
  GROWLOGS_EXPORT: "growlogs_export",
  GROWLOGS_BATCH: "growlogs_batch",
  GROWLOGS_COMPLIANCE: "growlogs_compliance",
  DIAGNOSE_AI: "diagnose_ai",
  DIAGNOSE_ADVANCED: "diagnose_advanced",
  DIAGNOSE_EXPORT: "diagnose_export",
  COURSES_CREATE: "courses_create",
  COURSES_ANALYTICS: "courses_analytics",
  COURSES_AFFILIATE: "courses_affiliate",
  FORUM_FEATURED: "forum_featured",
  FORUM_BRAND: "forum_brand",
  FORUM_INSIGHTS: "forum_insights"
};

// Entitlement matrix
// Each feature: { [role]: "enabled" | "disabled" | "cta" }
export const ENTITLEMENT_MATRIX = {
  [FEATURES.DASHBOARD_ANALYTICS]: {
    free: "cta",
    pro: "enabled",
    influencer: "enabled",
    commercial: "enabled",
    facility: "enabled"
  },
  [FEATURES.DASHBOARD_EXPORT]: {
    free: "cta",
    pro: "enabled",
    influencer: "enabled",
    commercial: "enabled",
    facility: "enabled"
  },
  [FEATURES.GROWLOGS_MULTI]: {
    free: "disabled",
    pro: "disabled",
    influencer: "cta",
    commercial: "enabled",
    facility: "enabled"
  },
  [FEATURES.GROWLOGS_EXPORT]: {
    free: "cta",
    pro: "enabled",
    influencer: "enabled",
    commercial: "enabled",
    facility: "enabled"
  },
  [FEATURES.GROWLOGS_BATCH]: {
    free: "disabled",
    pro: "disabled",
    influencer: "disabled",
    commercial: "enabled",
    facility: "enabled"
  },
  [FEATURES.GROWLOGS_COMPLIANCE]: {
    free: "disabled",
    pro: "disabled",
    influencer: "disabled",
    commercial: "disabled",
    facility: "enabled"
  },
  [FEATURES.DIAGNOSE_AI]: {
    free: "cta",
    pro: "enabled",
    influencer: "enabled",
    commercial: "enabled",
    facility: "enabled"
  },
  [FEATURES.DIAGNOSE_ADVANCED]: {
    free: "disabled",
    pro: "enabled",
    influencer: "enabled",
    commercial: "enabled",
    facility: "enabled"
  },
  [FEATURES.DIAGNOSE_EXPORT]: {
    free: "disabled",
    pro: "enabled",
    influencer: "enabled",
    commercial: "enabled",
    facility: "enabled"
  },
  [FEATURES.COURSES_CREATE]: {
    free: "disabled",
    pro: "cta",
    influencer: "enabled",
    commercial: "cta",
    facility: "enabled"
  },
  [FEATURES.COURSES_ANALYTICS]: {
    free: "disabled",
    pro: "cta",
    influencer: "enabled",
    commercial: "enabled",
    facility: "enabled"
  },
  [FEATURES.COURSES_AFFILIATE]: {
    free: "disabled",
    pro: "disabled",
    influencer: "enabled",
    commercial: "disabled",
    facility: "disabled"
  },
  [FEATURES.FORUM_FEATURED]: {
    free: "disabled",
    pro: "disabled",
    influencer: "enabled",
    commercial: "disabled",
    facility: "disabled"
  },
  [FEATURES.FORUM_BRAND]: {
    free: "disabled",
    pro: "disabled",
    influencer: "enabled",
    commercial: "disabled",
    facility: "disabled"
  },
  [FEATURES.FORUM_INSIGHTS]: {
    free: "disabled",
    pro: "disabled",
    influencer: "enabled",
    commercial: "enabled",
    facility: "enabled"
  },
  // Commercial/Facility-only features
  rooms_equipment_staff: {
    free: "disabled",
    pro: "disabled",
    influencer: "disabled",
    commercial: "enabled",
    facility: "enabled"
  },
  compliance_tools: {
    free: "disabled",
    pro: "disabled",
    influencer: "disabled",
    commercial: "disabled",
    facility: "enabled"
  },
  social_visibility_tools: {
    free: "disabled",
    pro: "disabled",
    influencer: "enabled",
    commercial: "disabled",
    facility: "disabled"
  }
};

// Utility: get entitlement for a feature/role
export function getEntitlement(feature, role) {
  const matrix = ENTITLEMENT_MATRIX[feature];
  if (!matrix) return "disabled";
  return matrix[role] || "disabled";
}

// --- compatibility export for existing code ---
export function getEntitlements(input = {}) {
  const role =
    input?.role ||
    input?.user?.role ||
    (input?.mode === "facility" ? "facility" : "user");

  return {
    role,
    // You can expand this later. For now keep app alive.
    can: (feature) => !!getEntitlement(feature, role),
    get: (feature) => getEntitlement(feature, role)
  };
}
