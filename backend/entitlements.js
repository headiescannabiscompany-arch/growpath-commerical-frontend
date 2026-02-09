// backend/entitlements.js
// Central contract: plan + mode + facilityRole -> capabilities + limits

const PLANS = ["free", "pro", "creator_plus", "commercial", "facility"];
const MODES = ["personal", "commercial", "facility"];
const FACILITY_ROLES = ["OWNER", "MANAGER", "STAFF", "VIEWER", "AUDITOR"];
const APP_ROLES = ["user", "admin"];

// Capability keys are action-scoped (verb-based)
const CAP = {
  // Courses
  COURSES_CREATE: "courses.create",
  COURSES_SELL_PAID: "courses.sell_paid",
  COURSES_CERTS: "courses.certificates",
  COURSES_ANALYTICS_BASIC: "courses.analytics.basic",
  COURSES_ANALYTICS_ADV: "courses.analytics.advanced",
  COURSES_BOOST_1: "courses.feed_boost.1",
  COURSES_BOOST_2: "courses.feed_boost.2",
  COURSES_REVIEW_REQUIRED: "courses.review.required",
  // Tools
  TOOL_SOIL: "tools.soil",
  TOOL_NPK: "tools.npk",
  TOOL_VPD: "tools.vpd",
  TOOL_FEED_SCHED: "tools.feed_scheduler",
  TOOL_HARVEST: "tools.harvest_estimator",
  TOOL_TIMELINE: "tools.timeline_planner",
  TOOL_PDF_EXPORT: "tools.pdf_export",
  TOOL_PHENO_MATRIX: "tools.pheno_matrix",
  // Commercial growth
  COMM_OFFERS: "commercial.offers",
  COMM_ADS: "commercial.advertising",
  COMM_LEADS: "commercial.leads",
  // Facility OS
  FAC_DASH: "facility.dashboard",
  FAC_COMPLIANCE: "facility.compliance",
  FAC_TEAM: "facility.team",
  FAC_SOPS: "facility.sops",
  FAC_AUDIT: "facility.audit",
  FAC_METRC: "facility.metrc",
  FAC_TASK_VERIFY: "facility.task_verification",
  FAC_OPS_ANALYTICS: "facility.ops_analytics"
};

const LIMITS_BY_PLAN = {
  free: { maxPaidCourses: 1, maxLessonsPerCourse: 7 },
  pro: { maxPaidCourses: 3, maxLessonsPerCourse: 20 },
  creator_plus: { maxPaidCourses: null, maxLessonsPerCourse: null },
  commercial: { maxPaidCourses: null, maxLessonsPerCourse: null },
  facility: { maxPaidCourses: null, maxLessonsPerCourse: null }
};

const PLAN_CAPS = {
  free: new Set([
    CAP.COURSES_CREATE,
    CAP.TOOL_SOIL,
    CAP.TOOL_NPK,
    CAP.TOOL_VPD,
    CAP.COURSES_REVIEW_REQUIRED
  ]),
  pro: new Set([
    CAP.COURSES_CREATE,
    CAP.TOOL_SOIL,
    CAP.TOOL_NPK,
    CAP.TOOL_VPD,
    CAP.TOOL_FEED_SCHED,
    CAP.TOOL_HARVEST,
    CAP.TOOL_TIMELINE,
    CAP.TOOL_PDF_EXPORT,
    CAP.TOOL_PHENO_MATRIX,
    CAP.COURSES_ANALYTICS_BASIC,
    CAP.COURSES_BOOST_1,
    CAP.COURSES_REVIEW_REQUIRED
  ]),
  creator_plus: new Set([
    CAP.COURSES_CREATE,
    CAP.COURSES_SELL_PAID,
    CAP.COURSES_CERTS,
    CAP.COURSES_ANALYTICS_ADV,
    CAP.COURSES_BOOST_2,
    CAP.TOOL_SOIL,
    CAP.TOOL_NPK,
    CAP.TOOL_VPD,
    CAP.TOOL_FEED_SCHED,
    CAP.TOOL_HARVEST,
    CAP.TOOL_TIMELINE,
    CAP.TOOL_PDF_EXPORT,
    CAP.TOOL_PHENO_MATRIX
  ]),
  commercial: new Set([
    ...Array.from(
      new Set([
        CAP.COURSES_CREATE,
        CAP.COURSES_SELL_PAID,
        CAP.COURSES_CERTS,
        CAP.COURSES_ANALYTICS_ADV,
        CAP.COURSES_BOOST_2,
        CAP.TOOL_SOIL,
        CAP.TOOL_NPK,
        CAP.TOOL_VPD,
        CAP.TOOL_FEED_SCHED,
        CAP.TOOL_HARVEST,
        CAP.TOOL_TIMELINE,
        CAP.TOOL_PDF_EXPORT,
        CAP.TOOL_PHENO_MATRIX
      ])
    ),
    CAP.COMM_OFFERS,
    CAP.COMM_ADS,
    CAP.COMM_LEADS
  ]),
  facility: new Set([
    ...Array.from(
      new Set([
        CAP.COURSES_CREATE,
        CAP.COURSES_SELL_PAID,
        CAP.COURSES_CERTS,
        CAP.COURSES_ANALYTICS_ADV,
        CAP.COURSES_BOOST_2,
        CAP.TOOL_SOIL,
        CAP.TOOL_NPK,
        CAP.TOOL_VPD,
        CAP.TOOL_FEED_SCHED,
        CAP.TOOL_HARVEST,
        CAP.TOOL_TIMELINE,
        CAP.TOOL_PDF_EXPORT,
        CAP.TOOL_PHENO_MATRIX
      ])
    ),
    CAP.FAC_DASH,
    CAP.FAC_COMPLIANCE,
    CAP.FAC_TEAM,
    CAP.FAC_SOPS,
    CAP.FAC_AUDIT,
    CAP.FAC_METRC,
    CAP.FAC_TASK_VERIFY,
    CAP.FAC_OPS_ANALYTICS
  ])
};

const MODE_REQUIRED_CAPS = {
  personal: new Set([]),
  commercial: new Set([CAP.COMM_OFFERS, CAP.COMM_ADS, CAP.COMM_LEADS]),
  facility: new Set([
    CAP.FAC_DASH,
    CAP.FAC_COMPLIANCE,
    CAP.FAC_TEAM,
    CAP.FAC_SOPS,
    CAP.FAC_AUDIT,
    CAP.FAC_METRC,
    CAP.FAC_TASK_VERIFY,
    CAP.FAC_OPS_ANALYTICS
  ])
};

const FACILITY_ROLE_GATES = {
  [CAP.FAC_SOPS]: ["OWNER", "MANAGER"],
  [CAP.FAC_TASK_VERIFY]: ["OWNER", "MANAGER"],
  [CAP.FAC_COMPLIANCE]: ["OWNER", "MANAGER", "AUDITOR"],
  [CAP.FAC_TEAM]: ["OWNER", "MANAGER"],
  [CAP.FAC_AUDIT]: ["OWNER", "MANAGER", "AUDITOR"],
  [CAP.FAC_METRC]: ["OWNER", "MANAGER"]
};

function computeEntitlements({ plan, mode, appRole, facilityRole }) {
  if (!PLANS.includes(plan)) plan = "free";
  if (!MODES.includes(mode)) mode = "personal";
  if (!APP_ROLES.includes(appRole)) appRole = "user";
  if (facilityRole && !FACILITY_ROLES.includes(facilityRole)) facilityRole = "VIEWER";

  // Admin: all caps, but still report requested mode/plan for UX
  if (appRole === "admin") {
    return {
      plan,
      mode,
      appRole,
      facilityRole: facilityRole || null,
      capabilities: Object.values(CAP),
      limits: LIMITS_BY_PLAN[plan]
    };
  }

  const caps = new Set(PLAN_CAPS[plan] || PLAN_CAPS.free);

  // Enforce mode-required caps: if mode implies certain caps and plan lacks them,
  // degrade mode to personal (or you can choose to throw during /api/me bootstrap).
  const required = MODE_REQUIRED_CAPS[mode] || new Set();
  for (const req of required) {
    if (!caps.has(req)) {
      mode = "personal";
      break;
    }
  }

  return {
    plan,
    mode,
    appRole,
    facilityRole: facilityRole || null,
    capabilities: Array.from(caps),
    limits: LIMITS_BY_PLAN[plan]
  };
}

function canInFacilityRole(capability, facilityRole) {
  const allowed = FACILITY_ROLE_GATES[capability];
  if (!allowed) return true;
  if (!facilityRole) return false;
  return allowed.includes(facilityRole);

  // Helpers for consistent server authorization checks
  function hasCap(ent, capability) {
    return Array.isArray(ent?.capabilities) && ent.capabilities.includes(capability);
  }

  function can(ent, capability) {
    if (!hasCap(ent, capability)) return false;

    const isFacilityCap = String(capability).startsWith("facility.");
    if (!isFacilityCap) return true;

    // Facility caps require facility context (role must be present) + role gates
    if (!ent?.facilityRole) return false;
    return canInFacilityRole(capability, ent.facilityRole);
  }
}

module.exports = {
  CAP,
  computeEntitlements,
  canInFacilityRole,
  hasCap,
  can,
  PLANS,
  MODES,
  FACILITY_ROLES
};
