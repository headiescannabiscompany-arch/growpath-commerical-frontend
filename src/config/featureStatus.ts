import { CAPABILITY_KEYS } from "@/entitlements/capabilityKeys";

export type FeatureStatus = "implemented" | "beta" | "coming_soon" | "hidden" | "backlog";

export type FeatureArea =
  | "personal_navigation"
  | "environment"
  | "water_nutrients"
  | "plant_health"
  | "crop_management"
  | "planning_records"
  | "genetics"
  | "lab_tc"
  | "integrations";

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
    status: "beta",
    href: "/home/personal"
  },
  grows: {
    key: "personal.grows",
    title: "Grows",
    description: "Grow workspaces, plants, logs, tasks, and history.",
    area: "personal_navigation",
    status: "beta",
    href: "/home/personal/grows"
  },
  tools: {
    key: "personal.tools",
    title: "Tools / AI",
    description: "Cultivation calculations, analysis, and integrations.",
    area: "personal_navigation",
    status: "beta",
    href: "/home/personal/tools"
  },
  community: {
    key: "personal.community",
    title: "Community",
    description: "Grow updates and community discussions.",
    area: "personal_navigation",
    status: "beta",
    href: "/home/personal/community"
  },
  profile: {
    key: "personal.profile",
    title: "Profile",
    description: "Account, privacy, units, and preferences.",
    area: "personal_navigation",
    status: "beta",
    href: "/home/personal/profile"
  },
  courses: {
    key: "personal.courses",
    title: "Courses",
    description: "Structured learning content.",
    area: "personal_navigation",
    status: "hidden"
  },
  facility: {
    key: "personal.facility",
    title: "Facility",
    description: "Commercial facility operations.",
    area: "personal_navigation",
    status: "hidden"
  }
} as const satisfies Record<string, Omit<FeatureDefinition, "internalNote">>;

export const personalToolFeatures = [
  {
    key: "tools.integrations",
    title: "Data Integrations",
    description: "Connect supported devices and map environmental data to grows.",
    area: "integrations",
    status: "beta",
    href: "/home/personal/tools/integrations",
    internalNote:
      "Pulse is implemented. Growlink is viable for read-only user-authorized data ingestion and awaits backend endpoints plus real credentials/hardware. UbiBot is parked until Developer Membership, credentials, and a real device/channel are available. Other providers require contracts, credentials, or adapters."
  },
  {
    key: "tools.vpd",
    title: "VPD Calculator",
    description: "Calculate leaf-aware VPD against a growth-stage target.",
    area: "environment",
    status: "implemented",
    href: "/home/personal/tools/vpd",
    acceptsGrowContext: true,
    internalNote: "Working calculator with grow log and task actions."
  },
  {
    key: "tools.dew_point_guard",
    title: "Dew Point Guard",
    description: "Analyze manual, CSV, or connected readings for condensation risk.",
    area: "environment",
    status: "beta",
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
    status: "beta",
    href: "/home/personal/tools/ppfd",
    acceptsGrowContext: true,
    internalNote: "Measured-light calculation works; fixture modeling remains incomplete."
  },
  {
    key: "tools.bud_rot_risk",
    title: "Bud Rot Risk",
    description: "Screen humidity, temperature, airflow, and wet-window risk factors.",
    area: "environment",
    status: "beta",
    href: "/home/personal/tools/bud-rot-risk",
    acceptsGrowContext: true,
    capabilityKey: CAPABILITY_KEYS.DIAGNOSE_ADVANCED,
    internalNote: "Heuristic screen, not a validated predictive model."
  },
  {
    key: "tools.npk_recipe",
    title: "NPK Recipe Calculator",
    description: "Build multi-product recipes with elemental ppm and release timing.",
    area: "water_nutrients",
    status: "beta",
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
    status: "beta",
    href: "/home/personal/tools/nutrient-chemistry",
    acceptsGrowContext: true,
    capabilityKey: CAPABILITY_KEYS.TOOL_NPK,
    internalNote:
      "Starter library requires complete source provenance and wider validation."
  },
  {
    key: "tools.watering",
    title: "Watering Planner",
    description: "Estimate watering volume using medium, stage, and environment.",
    area: "water_nutrients",
    status: "beta",
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
    status: "beta",
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
    status: "beta",
    href: "/home/personal/tools/feeding-schedule",
    acceptsGrowContext: true,
    internalNote:
      "Uses the backend feeding schedule endpoint when available and local stage-aware planning otherwise."
  },
  {
    key: "tools.harvest_estimator",
    title: "Harvest Estimator",
    description:
      "Estimate harvest windows from flowering day, cultivar timing, and maturity signals.",
    area: "planning_records",
    status: "beta",
    href: "/home/personal/tools/harvest-estimator",
    acceptsGrowContext: true,
    internalNote:
      "Local estimator with tool-run and journal save paths; not a lab-grade harvest prediction."
  },
  {
    key: "tools.timeline_planner",
    title: "Timeline Planner",
    description: "Plan grow milestones across veg, flower, drying, and cure windows.",
    area: "planning_records",
    status: "beta",
    href: "/home/personal/tools/timeline-planner",
    acceptsGrowContext: true,
    internalNote:
      "Local milestone builder can create grow tasks when grow context is present."
  },
  {
    key: "tools.pdf_export",
    title: "PDF / Export",
    description: "Prepare grow records, plants, tasks, and tool runs for export.",
    area: "planning_records",
    status: "beta",
    href: "/home/personal/tools/pdf-export",
    acceptsGrowContext: true,
    internalNote:
      "CSV package supports browser download and native share. Rendered PDF remains tracked separately."
  },
  {
    key: "tools.pheno_matrix",
    title: "Pheno Matrix",
    description: "Score phenotype candidates, weight traits, and rank keeper selections.",
    area: "genetics",
    status: "beta",
    href: "/home/personal/tools/pheno-matrix",
    acceptsGrowContext: true,
    internalNote:
      "Local weighted scoring matrix is implemented; persistence/export can follow endpoint support."
  },
  {
    key: "tools.ai_diagnosis",
    title: "Plant Issue Diagnosis",
    description: "Use photos and grow context for cautious plant-health triage.",
    area: "plant_health",
    status: "beta",
    href: "/home/personal/diagnose",
    acceptsGrowContext: true,
    internalNote:
      "Vision path works when configured; full ETGU intake and follow-up remain."
  },
  {
    key: "tools.crop_steering",
    title: "Crop Steering",
    description: "Plan irrigation phases, dryback, EC, and steering trials.",
    area: "crop_management",
    status: "hidden",
    href: "/home/personal/tools/crop-steering",
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
    status: "backlog",
    acceptsGrowContext: true,
    internalNote:
      "Future tool. Needs saveable recipes, release windows, source provenance, cost/batch math, and grow assignment before exposure."
  },
  {
    key: "tools.dry_amendment_mix",
    title: "Dry Amendment Mix Builder",
    description: "Blend dry amendments toward target ratios and dose rates.",
    area: "water_nutrients",
    status: "backlog",
    acceptsGrowContext: true,
    internalNote:
      "Future tool. Needs ingredient library, release timing, dose-per-volume math, and warnings before exposure."
  },
  {
    key: "tools.topdress_planner",
    title: "Topdress Planner",
    description: "Plan topdress amount, timing, release window, and follow-up tasks.",
    area: "water_nutrients",
    status: "backlog",
    acceptsGrowContext: true,
    internalNote:
      "Future tool. Needs soil volume, stage, amendment recipe, timing, task creation, and grow log wiring."
  },
  {
    key: "tools.ph_ec_adjustment",
    title: "pH / EC Adjustment",
    description: "Check pH and EC differences with safe adjustment warnings.",
    area: "water_nutrients",
    status: "backlog",
    acceptsGrowContext: true,
    internalNote:
      "Future limited-safety tool. Must not give exact dosing without known product concentration."
  },
  {
    key: "tools.nutrient_release_chemistry",
    title: "Nutrient Release Chemistry",
    description:
      "Compare nutrient forms, release classes, pH effects, and compatibility.",
    area: "water_nutrients",
    status: "backlog",
    acceptsGrowContext: true,
    internalNote:
      "Backend/frontend foundation exists in nutrient chemistry, but full source-reviewed tool pages and recipe confidence are backlog."
  },
  {
    key: "tools.crop_steering_projects",
    title: "Crop Steering Projects",
    description:
      "Track P0/P1/P2/P3, dryback, runoff, substrate EC, and steering response.",
    area: "crop_management",
    status: "backlog",
    acceptsGrowContext: true,
    internalNote:
      "Future full workflow. Current direct route stays hidden until projects/runs/log/task/automation/pheno scoring are real."
  },
  {
    key: "tools.stress_testing",
    title: "Stress Testing",
    description: "Record controlled stress response and recovery scoring.",
    area: "crop_management",
    status: "backlog",
    acceptsGrowContext: true,
    internalNote:
      "Future workflow for drought, heat, high VPD, high EC, intersex screening, and keeper-score impact."
  },
  {
    key: "tools.pheno_hunting",
    title: "Pheno Hunting",
    description:
      "Run staged pheno projects, score plants, and compare keeper candidates.",
    area: "genetics",
    status: "backlog",
    acceptsGrowContext: true,
    internalNote:
      "Future full project workflow. The current Pheno Matrix is only a beta local scoring surface."
  },
  {
    key: "tools.genetics_inventory",
    title: "Genetics Inventory / Breeding Planner",
    description:
      "Track cultivars, parentage, seed batches, breeding lanes, and target traits.",
    area: "genetics",
    status: "backlog",
    internalNote:
      "Future genetics inventory and breeding workflow; do not expose until persistence and reporting exist."
  },
  {
    key: "tools.tissue_culture",
    title: "Tissue Culture",
    description:
      "Track TC projects, explants, media, vessels, transfers, contamination, and acclimation.",
    area: "lab_tc",
    status: "backlog",
    acceptsGrowContext: true,
    internalNote: "Future lab workflow. Not built and must not be exposed as complete."
  },
  {
    key: "tools.dry_cure_guard",
    title: "Dry / Cure Guard",
    description: "Track drying room, jar RH, cure status, mold risk, and next actions.",
    area: "planning_records",
    status: "backlog",
    acceptsGrowContext: true,
    internalNote: "Future harvest batch workflow; needs dry/cure records and task wiring."
  },
  {
    key: "tools.clone_rooting",
    title: "Clone Rooting Troubleshooter",
    description: "Check clone rooting conditions, bottlenecks, and follow-up tasks.",
    area: "plant_health",
    status: "backlog",
    acceptsGrowContext: true,
    internalNote:
      "Future plant-health workflow; needs clone records and cautious diagnosis copy."
  },
  {
    key: "tools.ipm_scout",
    title: "IPM Scout / Pest & Organism Tool",
    description:
      "Record scouting observations, likely organisms, severity, and non-chemical next checks.",
    area: "plant_health",
    status: "backlog",
    acceptsGrowContext: true,
    internalNote:
      "Future/beta only after IPM organism library, regional alert rules, and licensed image/provider policy exist. No pesticide dosing."
  },
  {
    key: "tools.species_crop_identification",
    title: "Species / Crop Identification",
    description:
      "Identify likely crop/species from user input, image, or video with user confirmation.",
    area: "plant_health",
    status: "backlog",
    internalNote:
      "Future/beta only with licensed provider or source-reviewed taxon database. Must require user confirmation before crop-specific recommendations."
  },
  {
    key: "tools.harvest_readiness_ai",
    title: "Harvest Readiness AI",
    description:
      "Estimate harvest readiness from maturity signals, photos, cultivar timing, and user goals.",
    area: "planning_records",
    status: "backlog",
    acceptsGrowContext: true,
    internalNote:
      "Future AI workflow. Current Harvest Estimator remains a beta local estimator, not image readiness AI."
  },
  {
    key: "tools.run_comparison",
    title: "Run-To-Run Comparison",
    description:
      "Compare grows by yield, timing, issues, environment, feeding, quality, and keeper score.",
    area: "planning_records",
    status: "backlog",
    internalNote:
      "Future analytics workflow requiring normalized grow outcomes and history."
  },
  {
    key: "tools.auto_grow_calendar",
    title: "Auto Grow Calendar",
    description:
      "Generate stage timelines, task schedules, reminders, and harvest windows.",
    area: "planning_records",
    status: "backlog",
    acceptsGrowContext: true,
    internalNote:
      "Future calendar workflow; must create real tasks/events and reload from grow history."
  },
  {
    key: "tools.product_ingredient_library",
    title: "Product / Ingredient Library",
    description:
      "Store labels, elemental nutrients, nutrient forms, density, and source confidence.",
    area: "water_nutrients",
    status: "backlog",
    internalNote:
      "Backend ingredient endpoints exist, but release exposure needs provenance review, source records, and product-label validation."
  },
  {
    key: "tools.crop_profile_database",
    title: "Crop Profile / Taxon Database",
    description:
      "Manage reviewed crop profiles, taxonomy, environment targets, IPM rules, and source records.",
    area: "plant_health",
    status: "backlog",
    internalNote:
      "Draft user-entered crop profile flow exists. Admin/source review and seeded licensed data remain backlog."
  }
] as const satisfies readonly FeatureDefinition[];

export function isFeatureNavigable(feature: Pick<FeatureDefinition, "status" | "href">) {
  return (
    Boolean(feature.href) &&
    (feature.status === "implemented" || feature.status === "beta")
  );
}

export function getNavigablePersonalTools() {
  return personalToolFeatures.filter(isFeatureNavigable) as FeatureDefinition[];
}
