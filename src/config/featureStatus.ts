import { CAPABILITY_KEYS } from "@/entitlements/capabilityKeys";

export type FeatureStatus =
  | "release"
  | "beta"
  | "internal_ai_only"
  | "remove_from_user_app"
  | "disabled";

export type FeatureArea =
  | "personal_navigation"
  | "environment"
  | "water_nutrients"
  | "plant_health"
  | "crop_management"
  | "planning_records"
  | "genetics"
  | "lab_tc"
  | "integrations"
  | "business_production";

export type FeatureDefinition = {
  key: string;
  title: string;
  description: string;
  area: FeatureArea;
  status: FeatureStatus;
  href?: string;
  acceptsGrowContext?: boolean;
  capabilityKey?: string;
  internalNote: string;
};

export const personalFeatures = {
  home: {
    key: "personal.home",
    title: "Home",
    description: "Daily grow overview and quick actions.",
    area: "personal_navigation",
    status: "release",
    href: "/home/personal"
  },
  grows: {
    key: "personal.grows",
    title: "Grows",
    description: "Grow workspaces, plants, logs, tasks, and history.",
    area: "personal_navigation",
    status: "release",
    href: "/home/personal/grows"
  },
  tools: {
    key: "personal.tools",
    title: "Tools / AI",
    description: "Cultivation calculations, analysis, and integrations.",
    area: "personal_navigation",
    status: "release",
    href: "/home/personal/tools"
  },
  community: {
    key: "personal.community",
    title: "Community",
    description: "Grow updates and community discussions.",
    area: "personal_navigation",
    status: "release",
    href: "/home/personal/community"
  },
  profile: {
    key: "personal.profile",
    title: "Profile",
    description: "Account, privacy, units, and preferences.",
    area: "personal_navigation",
    status: "release",
    href: "/home/personal/profile"
  },
  courses: {
    key: "personal.courses",
    title: "Courses",
    description: "Create, sell, and take structured learning content.",
    area: "personal_navigation",
    status: "release",
    href: "/home/personal/courses"
  },
  facility: {
    key: "personal.facility",
    title: "Facility",
    description: "Commercial facility operations.",
    area: "personal_navigation",
    status: "remove_from_user_app"
  }
} as const satisfies Record<string, Omit<FeatureDefinition, "internalNote">>;

export const personalToolFeatures = [
  {
    key: "tools.integrations",
    title: "Data Integrations",
    description: "Connect supported devices and map environmental data to grows.",
    area: "integrations",
    status: "release",
    href: "/home/personal/tools/integrations",
    internalNote:
      "Pulse is implemented. Growlink is viable for read-only user-authorized data ingestion and awaits backend endpoints plus real credentials/hardware. UbiBot is parked until Developer Membership, credentials, and a real device/channel are available. Other providers require contracts, credentials, or adapters."
  },
  {
    key: "tools.vpd",
    title: "VPD Calculator",
    description: "Calculate leaf-aware VPD against a growth-stage target.",
    area: "environment",
    status: "release",
    href: "/home/personal/tools/vpd",
    acceptsGrowContext: true,
    internalNote: "Working calculator with grow log and task actions."
  },
  {
    key: "tools.dew_point_guard",
    title: "Dew Point Guard",
    description: "Analyze manual, CSV, or connected readings for condensation risk.",
    area: "environment",
    status: "release",
    href: "/home/personal/tools/dew-point-guard",
    acceptsGrowContext: true,
    internalNote:
      "Strong foundation; charts, alerts, and broader provider support remain."
  },
  {
    key: "tools.ppfd_dli",
    title: "PPFD / DLI Planner",
    description: "Compare measured light against DLI and photoperiod targets.",
    area: "environment",
    status: "release",
    href: "/home/personal/tools/ppfd",
    acceptsGrowContext: true,
    internalNote: "Measured-light calculation works; fixture modeling remains incomplete."
  },
  {
    key: "tools.bud_rot_risk",
    title: "Bud Rot Risk",
    description: "Screen humidity, temperature, airflow, and wet-window risk factors.",
    area: "environment",
    status: "release",
    href: "/home/personal/tools/bud-rot-risk",
    acceptsGrowContext: true,
    capabilityKey: CAPABILITY_KEYS.DIAGNOSE_ADVANCED,
    internalNote: "Heuristic screen, not a validated predictive model."
  },
  {
    key: "tools.npk_recipe",
    title: "NPK / Feed Recipe Builder",
    description: "Build multi-product recipes with elemental ppm and release timing.",
    area: "water_nutrients",
    status: "release",
    href: "/home/personal/tools/npk",
    acceptsGrowContext: true,
    capabilityKey: CAPABILITY_KEYS.TOOL_NPK,
    internalNote:
      "Twenty-row recipe foundation exists; chemistry and measured-EC work remains."
  },
  {
    key: "tools.nutrient_chemistry",
    title: "Nutrient Chemistry",
    description: "Compare nutrient forms, release behavior, pH effects, and use cases.",
    area: "water_nutrients",
    status: "release",
    href: "/home/personal/tools/nutrient-chemistry",
    acceptsGrowContext: true,
    capabilityKey: CAPABILITY_KEYS.TOOL_NPK,
    internalNote:
      "Starter library requires complete source provenance and wider validation."
  },
  {
    key: "tools.nutrient_source_comparison",
    title: "Nutrient Source Comparison",
    description: "Compare source speed, pH effects, secondary nutrients, and use cases.",
    area: "water_nutrients",
    status: "release",
    href: "/home/personal/tools/nutrient-source-comparison",
    acceptsGrowContext: true,
    capabilityKey: CAPABILITY_KEYS.TOOL_NPK,
    internalNote:
      "V1 release view inside the nutrient system. Uses starter source categories and keeps provenance expansion in the ingredient library backlog."
  },
  {
    key: "tools.product_ingredient_library",
    title: "Product / Ingredient Library",
    description:
      "Create and manage nutrient, amendment, soil, and input records for recipes and grow planning.",
    area: "water_nutrients",
    status: "release",
    href: "/home/personal/tools/ingredient-library",
    capabilityKey: CAPABILITY_KEYS.TOOL_NPK,
    internalNote:
      "V1 release CRUD surface for user-entered ingredients with label NPK, source confidence, favorites, and archive support."
  },
  {
    key: "tools.watering",
    title: "Watering Planner",
    description: "Estimate watering volume using medium, stage, and environment.",
    area: "water_nutrients",
    status: "release",
    href: "/home/personal/tools/watering",
    acceptsGrowContext: true,
    internalNote: "Heuristic estimate; history and substrate measurements remain."
  },
  {
    key: "tools.environment_analysis",
    title: "AI Environment Analysis",
    description:
      "Send temperature, humidity, VPD, PPFD, DLI, and CO2 context to the environment analysis endpoint.",
    area: "environment",
    status: "release",
    href: "/home/personal/tools/environment-analysis",
    acceptsGrowContext: true,
    internalNote:
      "Endpoint-backed analysis when AI is enabled; local heuristic fallback keeps the tool useful for every account."
  },
  {
    key: "tools.feeding_schedule",
    title: "AI Feeding Schedule",
    description:
      "Generate a stage-aware feeding schedule from nutrient and grow-medium context.",
    area: "water_nutrients",
    status: "release",
    href: "/home/personal/tools/feeding-schedule",
    acceptsGrowContext: true,
    capabilityKey: CAPABILITY_KEYS.FEEDING_SCHEDULE,
    internalNote:
      "Uses the backend feeding schedule endpoint when available and local stage-aware planning otherwise."
  },
  {
    key: "tools.harvest_estimator",
    title: "Harvest Estimator",
    description:
      "Estimate harvest windows from flowering day, cultivar timing, and maturity signals.",
    area: "planning_records",
    status: "release",
    href: "/home/personal/tools/harvest-estimator",
    acceptsGrowContext: true,
    capabilityKey: CAPABILITY_KEYS.TOOL_HARVEST_ESTIMATOR,
    internalNote:
      "Local estimator with tool-run and journal save paths; not a lab-grade harvest prediction."
  },
  {
    key: "tools.timeline_planner",
    title: "Timeline Planner",
    description: "Plan grow milestones across veg, flower, drying, and cure windows.",
    area: "planning_records",
    status: "release",
    href: "/home/personal/tools/timeline-planner",
    acceptsGrowContext: true,
    capabilityKey: CAPABILITY_KEYS.TOOL_TIMELINE_PLANNER,
    internalNote:
      "Local milestone builder can create grow tasks when grow context is present."
  },
  {
    key: "tools.pdf_export",
    title: "PDF / Export",
    description: "Prepare grow records, plants, tasks, and tool runs for export.",
    area: "planning_records",
    status: "release",
    href: "/home/personal/tools/pdf-export",
    acceptsGrowContext: true,
    capabilityKey: CAPABILITY_KEYS.TOOL_PDF_EXPORT,
    internalNote:
      "CSV package supports browser download and native share. Rendered PDF remains tracked separately."
  },
  {
    key: "tools.pheno_matrix",
    title: "Pheno Matrix",
    description: "Score phenotype candidates, weight traits, and rank keeper selections.",
    area: "genetics",
    status: "release",
    href: "/home/personal/tools/pheno-matrix",
    acceptsGrowContext: true,
    capabilityKey: CAPABILITY_KEYS.TOOL_PHENO_MATRIX,
    internalNote:
      "Local weighted scoring matrix is implemented; persistence/export can follow endpoint support."
  },
  {
    key: "tools.ai_diagnosis",
    title: "Plant Issue Diagnosis",
    description: "Use photos and grow context for cautious plant-health triage.",
    area: "plant_health",
    status: "release",
    href: "/home/personal/diagnose",
    acceptsGrowContext: true,
    capabilityKey: CAPABILITY_KEYS.DIAGNOSE_AI,
    internalNote:
      "Vision path works when configured; full ETGU intake and follow-up remain."
  },
  {
    key: "tools.crop_steering",
    title: "Crop Steering",
    description: "Plan irrigation phases, dryback, EC, and steering trials.",
    area: "crop_management",
    status: "remove_from_user_app",
    href: undefined,
    acceptsGrowContext: true,
    internalNote:
      "Current screen is a scaffold and must not be exposed as a complete tool."
  },
  {
    key: "tools.soil_builder",
    title: "Soil Builder",
    description:
      "Build full soil mixes with base, compost, aeration, minerals, and amendments.",
    area: "water_nutrients",
    status: "beta",
    href: "/home/personal/tools/soil-builder",
    acceptsGrowContext: true,
    capabilityKey: CAPABILITY_KEYS.TOOL_NPK,
    internalNote:
      "Approved beta soil/nutrient workflow wired to ToolRun, grow context, logs, tasks, and backend soil mix calculations."
  },
  {
    key: "tools.dry_amendment_mix",
    title: "Dry Amendment Mix Builder",
    description: "Blend dry amendments toward target ratios and dose rates.",
    area: "water_nutrients",
    status: "beta",
    href: "/home/personal/tools/dry-amendment-mix",
    acceptsGrowContext: true,
    capabilityKey: CAPABILITY_KEYS.TOOL_NPK,
    internalNote:
      "Approved beta dry amendment workflow wired to ToolRun, grow context, logs, tasks, and nutrient release calculations."
  },
  {
    key: "tools.topdress_planner",
    title: "Topdress Planner",
    description: "Plan topdress amount, timing, release window, and follow-up tasks.",
    area: "water_nutrients",
    status: "beta",
    href: "/home/personal/tools/topdress",
    acceptsGrowContext: true,
    capabilityKey: CAPABILITY_KEYS.TOOL_NPK,
    internalNote:
      "Approved beta task/calendar workflow wired to ToolRun, grow context, logs, tasks, and release timing warnings."
  },
  {
    key: "tools.ph_ec_adjustment",
    title: "pH / EC Range Check",
    description: "Check input/runoff pH and EC with safe adjustment warnings.",
    area: "water_nutrients",
    status: "beta",
    href: "/home/personal/tools/ph-ec",
    acceptsGrowContext: true,
    capabilityKey: CAPABILITY_KEYS.TOOL_NPK,
    internalNote:
      "Approved beta pH/EC range workflow. It does not recommend exact pH up/down dosing without product concentration."
  },
  {
    key: "tools.crop_steering_projects",
    title: "Crop Steering Projects",
    description:
      "Track P0/P1/P2/P3, dryback, runoff, substrate EC, and steering response.",
    area: "crop_management",
    status: "beta",
    href: "/home/personal/tools/crop-steering-project",
    acceptsGrowContext: true,
    internalNote:
      "Approved beta crop steering project workflow wired to grow context, saved ToolRuns, log summaries, and follow-up tasks."
  },
  {
    key: "tools.stress_testing",
    title: "Stress Testing",
    description: "Record controlled stress response and recovery scoring.",
    area: "crop_management",
    status: "beta",
    href: "/home/personal/tools/stress-test",
    acceptsGrowContext: true,
    internalNote:
      "Approved beta stress-response record workflow wired to plant/grow context and pheno-scoring outputs."
  },
  {
    key: "tools.pheno_hunting",
    title: "Pheno Hunting",
    description:
      "Run staged pheno projects, score plants, record photos, sensory notes, lab notes, terpene/flavor notes, and compare keeper candidates.",
    area: "genetics",
    status: "beta",
    href: "/home/personal/tools/pheno-hunt",
    acceptsGrowContext: true,
    internalNote:
      "Approved beta pheno selection workflow wired to plant/grow context and ToolRun persistence."
  },
  {
    key: "tools.genetics_inventory",
    title: "Genetics Notes",
    description:
      "Track cultivars, parentage, seed batches, breeding lane notes, terpene/flavor targets, project use, and user decisions.",
    area: "genetics",
    status: "beta",
    href: "/home/personal/tools/genetics-inventory",
    acceptsGrowContext: true,
    internalNote:
      "Approved beta genetics/material notes workflow. This is not generic personal inventory."
  },
  {
    key: "tools.tissue_culture",
    title: "Tissue Culture",
    description:
      "Track TC projects, explants, media, vessels, transfers, contamination, and acclimation.",
    area: "lab_tc",
    status: "beta",
    href: "/home/personal/tools/tissue-culture",
    acceptsGrowContext: true,
    internalNote:
      "Approved beta TC protocol/task workflow wired to saved ToolRuns, records, and follow-up reminders."
  },
  {
    key: "tools.dry_cure_guard",
    title: "Dry / Cure Guard",
    description: "Track drying room, jar RH, cure status, mold risk, and next actions.",
    area: "planning_records",
    status: "beta",
    href: "/home/personal/tools/dry-cure-guard",
    acceptsGrowContext: true,
    internalNote:
      "Approved beta dry/cure workflow wired to harvest/grow context, ToolRuns, log summaries, and check tasks."
  },
  {
    key: "tools.clone_rooting",
    title: "Clone Rooting Troubleshooter",
    description: "Check clone rooting conditions, bottlenecks, and follow-up tasks.",
    area: "plant_health",
    status: "beta",
    href: "/home/personal/tools/clone-rooting",
    acceptsGrowContext: true,
    internalNote:
      "Approved beta clone-room workflow wired to grow context, saved ToolRuns, and follow-up tasks."
  },
  {
    key: "tools.ipm_scout",
    title: "IPM Scout / Pest & Organism Tool",
    description:
      "Record scouting observations, likely organisms, severity, and non-chemical next checks.",
    area: "plant_health",
    status: "beta",
    href: "/home/personal/tools/ipm-scout",
    acceptsGrowContext: true,
    internalNote:
      "Approved beta IPM scouting workflow. It records cautious evidence and follow-up tasks without reckless pesticide dosing."
  },
  {
    key: "tools.species_crop_identification",
    title: "Species / Crop Identification",
    description:
      "Confirm crop/species identity for diagnosis, nutrient, environment, and IPM context.",
    area: "plant_health",
    status: "beta",
    href: "/home/personal/tools/species-crop-id",
    acceptsGrowContext: true,
    internalNote:
      "Approved beta crop-context workflow. Regional invasive alerts stay out of current programming."
  },
  {
    key: "tools.harvest_readiness_ai",
    title: "Harvest Readiness AI",
    description:
      "Estimate harvest readiness from maturity signals, photos, cultivar timing, and user goals.",
    area: "planning_records",
    status: "beta",
    href: "/home/personal/tools/harvest-readiness",
    acceptsGrowContext: true,
    internalNote:
      "Approved beta harvest-readiness workflow using maturity signals, cultivar timing, user goals, ToolRuns, logs, and tasks."
  },
  {
    key: "tools.run_comparison",
    title: "Run-To-Run Comparison",
    description:
      "Compare grows by yield, timing, issues, environment, feeding, quality, and keeper score.",
    area: "planning_records",
    status: "beta",
    href: "/home/personal/tools/run-comparison",
    internalNote:
      "Approved beta comparison workflow; keep visible unless the user later decides it is too large."
  },
  {
    key: "tools.auto_grow_calendar",
    title: "Auto Grow Calendar",
    description:
      "Generate stage timelines, task schedules, reminders, and harvest windows.",
    area: "planning_records",
    status: "beta",
    href: "/home/personal/tools/auto-grow-calendar",
    acceptsGrowContext: true,
    internalNote:
      "Approved beta grow calendar workflow wired to stage timelines, ToolRuns, logs, and task creation."
  },
  {
    key: "tools.soil_nutrient_batch_planner",
    title: "Soil & Nutrient Batch Planner",
    description:
      "Estimate soil/amendment batch costs, bag counts, pull sheets, labor, packaging, and margin.",
    area: "business_production",
    status: "beta",
    href: "/home/personal/tools/soil-nutrient-batch",
    internalNote:
      "Approved beta soil/nutrient batch planning workflow without brand wording."
  },
  {
    key: "tools.inventory",
    title: "Inventory",
    description:
      "Track nutrients, amendments, soil inputs, seeds, clones, packaging, and grow supplies.",
    area: "business_production",
    status: "remove_from_user_app",
    href: undefined,
    acceptsGrowContext: true,
    internalNote:
      "Inventory belongs to commercial and facility surfaces, not the personal tools hub."
  }
] as const satisfies readonly FeatureDefinition[];

export function isFeatureNavigable(
  feature: Pick<FeatureDefinition, "status" | "href">,
  options: { allowBetaSurfaces?: boolean } = {}
) {
  if (!feature.href) return false;
  if (feature.status === "release") return true;
  return feature.status === "beta" && options.allowBetaSurfaces === true;
}

export function getNavigablePersonalTools(options: { allowBetaSurfaces?: boolean } = {}) {
  return personalToolFeatures.filter((feature) =>
    isFeatureNavigable(feature, options)
  ) as FeatureDefinition[];
}
