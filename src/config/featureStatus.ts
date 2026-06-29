import { CAPABILITY_KEYS } from "@/entitlements/capabilityKeys";

export type FeatureStatus = "implemented" | "beta" | "coming_soon" | "hidden";

export type FeatureArea =
  | "personal_navigation"
  | "environment"
  | "water_nutrients"
  | "ai"
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
    capabilityKey: CAPABILITY_KEYS.AI_ASSISTANT,
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
    capabilityKey: CAPABILITY_KEYS.FEEDING_SCHEDULE,
    internalNote:
      "Uses the backend feeding schedule endpoint when available and local stage-aware planning otherwise."
  },
  {
    key: "tools.harvest_estimator",
    title: "Harvest Estimator",
    description:
      "Estimate harvest windows from flowering day, cultivar timing, and maturity signals.",
    area: "ai",
    status: "beta",
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
    area: "ai",
    status: "beta",
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
    area: "integrations",
    status: "beta",
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
    area: "ai",
    status: "beta",
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
    area: "ai",
    status: "beta",
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
    area: "environment",
    status: "hidden",
    href: "/home/personal/tools/crop-steering",
    acceptsGrowContext: true,
    internalNote:
      "Current screen is a scaffold and must not be exposed as a complete tool."
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
