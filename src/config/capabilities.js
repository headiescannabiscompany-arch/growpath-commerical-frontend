// Capability derivation for GrowPath
// Usage: deriveCapabilities({ plan, mode, entitlements, limits })

const FEATURE_KEYS = [
  "tools.soilCalc",
  "tools.npkCalc",
  "tools.vpdCalc",
  "tools.stageTimeline",
  "tools.phenoMatrix",
  "analytics.basic",
  "analytics.advanced",
  "analytics.facility",
  "ai.diagnose",
  "ai.environmentCoach",
  "ai.trainingCoach",
  "community.forumRead",
  "community.forumPost",
  "community.feedRead",
  "community.feedPost",
  "courses.create",
  "courses.sell",
  "seller.storefront",
  "seller.products",
  "seller.links",
  "seller.clickTracking",
  "seller.campaigns",
  "seller.socialComposer",
  "facility.users",
  "facility.complianceExports",
  "facility.auditLogs",
  "facility.tasksJobs",
  "facility.multiGrow",
  "facility.phenoTracking"
];

const PLAN_CAPS = {
  free: {
    grows: 1,
    plants: 1,
    "analytics.basic": true,
    "community.forumRead": true,
    "community.forumPost": true,
    "community.feedRead": true,
    "courses.create": true,
    "courses.sell": true,
    "ai.diagnose": true,
    "ai.environmentCoach": true,
    "ai.trainingCoach": true,
    // Locked features
    "tools.soilCalc": false,
    "tools.npkCalc": false,
    "tools.vpdCalc": false,
    "tools.stageTimeline": false,
    "tools.phenoMatrix": false,
    "analytics.advanced": false,
    "analytics.facility": false,
    "community.feedPost": false,
    "seller.storefront": false,
    "seller.products": false,
    "seller.links": false,
    "seller.clickTracking": false,
    "seller.campaigns": false,
    "seller.socialComposer": false,
    "facility.users": false,
    "facility.complianceExports": false,
    "facility.auditLogs": false,
    "facility.tasksJobs": false,
    "facility.multiGrow": false,
    "facility.phenoTracking": false
  },
  pro: {
    grows: 5,
    plants: 25,
    "analytics.basic": true,
    "analytics.advanced": true,
    "community.forumRead": true,
    "community.forumPost": true,
    "community.feedRead": true,
    "community.feedPost": true,
    "courses.create": true,
    "courses.sell": true,
    "ai.diagnose": true,
    "ai.environmentCoach": true,
    "ai.trainingCoach": true,
    "tools.soilCalc": true,
    "tools.npkCalc": true,
    "tools.vpdCalc": true,
    "tools.stageTimeline": true,
    "tools.phenoMatrix": true,
    // Locked features
    "analytics.facility": false,
    "seller.storefront": false,
    "seller.products": false,
    "seller.links": false,
    "seller.clickTracking": false,
    "seller.campaigns": false,
    "seller.socialComposer": false,
    "facility.users": false,
    "facility.complianceExports": false,
    "facility.auditLogs": false,
    "facility.tasksJobs": false,
    "facility.multiGrow": false,
    "facility.phenoTracking": false
  },
  commercial: {
    grows: 20,
    plants: 100,
    "analytics.basic": true,
    "analytics.advanced": true,
    "community.forumRead": true,
    "community.forumPost": true,
    "community.feedRead": true,
    "community.feedPost": true,
    "courses.create": true,
    "courses.sell": true,
    "ai.diagnose": true,
    "ai.environmentCoach": true,
    "ai.trainingCoach": true,
    "tools.soilCalc": true,
    "tools.npkCalc": true,
    "tools.vpdCalc": true,
    "tools.stageTimeline": true,
    "tools.phenoMatrix": true,
    "seller.storefront": true,
    "seller.products": true,
    "seller.links": true,
    "seller.clickTracking": true,
    "seller.campaigns": true,
    "seller.socialComposer": true,
    // Locked features
    "analytics.facility": false,
    "facility.users": false,
    "facility.complianceExports": false,
    "facility.auditLogs": false,
    "facility.tasksJobs": false,
    "facility.multiGrow": false,
    "facility.phenoTracking": false
  },
  facility: {
    grows: 100,
    plants: 1000,
    "analytics.basic": true,
    "analytics.advanced": true,
    "analytics.facility": true,
    "community.forumRead": true,
    "community.forumPost": true,
    "community.feedRead": true,
    "community.feedPost": true,
    "courses.create": true,
    "courses.sell": true,
    "ai.diagnose": true,
    "ai.environmentCoach": true,
    "ai.trainingCoach": true,
    "tools.soilCalc": true,
    "tools.npkCalc": true,
    "tools.vpdCalc": true,
    "tools.stageTimeline": true,
    "tools.phenoMatrix": true,
    "seller.storefront": true,
    "seller.products": true,
    "seller.links": true,
    "seller.clickTracking": true,
    "seller.campaigns": true,
    "seller.socialComposer": true,
    "facility.users": true,
    "facility.complianceExports": true,
    "facility.auditLogs": true,
    "facility.tasksJobs": true,
    "facility.multiGrow": true,
    "facility.phenoTracking": true
  }
};

/**
 * @typedef {import('./capabilities.d.ts').Capabilities} Capabilities
 * @returns {Capabilities}
 */
export function deriveCapabilities({ plan, mode, entitlements = {}, limits = {} }) {
  const baseCaps = PLAN_CAPS[plan] || PLAN_CAPS["free"];
  // Merge entitlements and limits
  /** @type {Capabilities} */
  const caps = { maxGrows: 0, maxPlants: 0, ...baseCaps, ...entitlements };
  // Assign numeric limits directly
  caps["maxGrows"] = limits.maxGrows || baseCaps.grows || 0;
  caps["maxPlants"] = limits.maxPlants || baseCaps.plants || 0;
  // Mode-specific logic (if needed)
  // Example: restrict commercial tools to commercial mode only
  if (plan === "commercial" && mode !== "commercial") {
    caps["seller.storefront"] = false;
    caps["seller.products"] = false;
    caps["seller.links"] = false;
    caps["seller.clickTracking"] = false;
    caps["seller.campaigns"] = false;
    caps["seller.socialComposer"] = false;
  }
  if (plan === "facility" && mode !== "facility") {
    caps["facility.users"] = false;
    caps["facility.complianceExports"] = false;
    caps["facility.auditLogs"] = false;
    caps["facility.tasksJobs"] = false;
    caps["facility.multiGrow"] = false;
    caps["facility.phenoTracking"] = false;
  }
  return caps;
}

export const CAPABILITY_KEYS = FEATURE_KEYS;
