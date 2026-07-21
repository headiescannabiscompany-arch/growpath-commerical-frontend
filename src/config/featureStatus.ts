import { CAPABILITY_KEYS } from "@/entitlements/capabilityKeys";

export type FeatureStatus =
  | "release"
  | "beta"
  | "internal_ai_only"
  | "remove_from_user_app"
  | "disabled";

export const PREVIEW_TOOL_STATUS: FeatureStatus = "beta";

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

export type ToolExperience = {
  mode: "ai" | "ai_assisted" | "calculated" | "guided" | "library";
  aiCredits: "never" | "optional" | "required";
  grow: "not_needed" | "optional" | "required";
  audience?: "general" | "cannabis_context" | "commercial";
  inputSummary: string;
  outputSummary: string;
};

export type FeatureDefinition = {
  key: string;
  title: string;
  description: string;
  area: FeatureArea;
  status: FeatureStatus;
  href?: string;
  hubVisible?: boolean;
  acceptsGrowContext?: boolean;
  capabilityKey?: string;
  experience?: ToolExperience;
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
    title: "AI Tools",
    description:
      "User-facing AI, diagnosis, light analysis, and soil/nutrient mix workflows.",
    area: "personal_navigation",
    status: "release",
    href: "/home/personal/tools"
  },
  community: {
    key: "personal.community",
    title: "Forum / Q&A",
    description: "Forum discussions, Q&A, and grow help.",
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

export const personalToolFeatures: readonly FeatureDefinition[] = [
  {
    key: "tools.integrations",
    title: "Data Integrations",
    description: "Connect supported devices and map environmental data to grows.",
    area: "integrations",
    status: "release",
    href: "/home/personal/tools/integrations",
    hubVisible: false,
    internalNote:
      "Grow-owned workflow surfaced from Grows, not AI Tools. Pulse is implemented. Growlink is viable for read-only user-authorized data ingestion and awaits backend endpoints plus real credentials/hardware. UbiBot is parked until Developer Membership, credentials, and a real device/channel are available. Other providers require contracts, credentials, or adapters."
  },
  {
    key: "tools.vpd",
    title: "VPD Calculator",
    description: "Calculate leaf-aware VPD against a growth-stage target.",
    area: "environment",
    status: "release",
    href: "/home/personal/tools/vpd",
    hubVisible: false,
    acceptsGrowContext: true,
    internalNote:
      "Working calculation used by AI, telemetry context, saved results, and legacy links; intentionally hidden from user discovery as a small technical calculator."
  },
  {
    key: "tools.dew_point_guard",
    title: "Environment Monitor",
    description:
      "Find lights-off RH spikes, dew point risk windows, airflow risk, and mold-prone periods from manual, CSV, or connected readings.",
    area: "environment",
    status: "release",
    href: "/home/personal/tools/dew-point-guard",
    hubVisible: false,
    acceptsGrowContext: true,
    internalNote:
      "AI/telemetry support workflow intentionally hidden from user discovery; charts, alerts, and broader provider support remain."
  },
  {
    key: "tools.ppfd_dli",
    title: "PPFD / DLI Analyzer",
    description:
      "Use PAR meter or phone-app readings across the canopy to estimate DLI, hot spots, low spots, and stage fit.",
    area: "environment",
    status: "release",
    href: "/home/personal/tools/ppfd",
    acceptsGrowContext: true,
    experience: {
      mode: "calculated",
      aiCredits: "never",
      grow: "optional",
      audience: "general",
      inputSummary: "A canopy PPFD map or average, light hours, and growth stage.",
      outputSummary:
        "DLI, hot/low spots, coverage spread, stage fit, and safer next checks."
    },
    internalNote: "Measured-light calculation works; fixture modeling remains incomplete."
  },
  {
    key: "tools.bud_rot_risk",
    title: "Bud Rot Risk",
    description: "Duplicate risk screen folded into Environment Monitor.",
    area: "environment",
    status: "remove_from_user_app",
    href: undefined,
    acceptsGrowContext: true,
    capabilityKey: CAPABILITY_KEYS.DIAGNOSE_ADVANCED,
    internalNote: "Heuristic screen, not a validated predictive model."
  },
  {
    key: "tools.mix_builders",
    title: "Soil & Nutrient Mix Builders",
    description:
      "Choose one science-based workflow: build a nutrient mix from verified labels and batch context, or build a soil mix from media structure, compost, minerals, and amendments.",
    area: "water_nutrients",
    status: "release",
    href: "/home/personal/tools/recipe-builder",
    acceptsGrowContext: true,
    capabilityKey: CAPABILITY_KEYS.TOOL_NPK,
    experience: {
      mode: "guided",
      aiCredits: "optional",
      grow: "optional",
      audience: "general",
      inputSummary:
        "Choose nutrient or soil, then bring verified labels, batch details, water or media context, and your intended use.",
      outputSummary:
        "One focused builder with visible calculations, evidence quality, assumptions, release timing, and warnings."
    },
    internalNote:
      "Single Personal Tools discovery entry for the two canonical builders. Supporting chemistry, source comparison, dry-amendment, label-library, and topdress workflows must not appear as competing builders."
  },
  {
    key: "tools.npk_recipe",
    title: "Nutrient Mix Builder",
    description:
      "Build science-based nutrient mixes from verified labels, batch volume, elemental conversions, nutrient forms, release timing, and stated assumptions.",
    area: "water_nutrients",
    status: "release",
    href: "/home/personal/tools/npk",
    hubVisible: false,
    acceptsGrowContext: true,
    capabilityKey: CAPABILITY_KEYS.TOOL_NPK,
    experience: {
      mode: "calculated",
      aiCredits: "never",
      grow: "optional",
      audience: "general",
      inputSummary:
        "Verified product labels, amounts, units, batch volume, and water baseline.",
      outputSummary:
        "Elemental ppm, N-P-K ratio, mixing order, release timing, and warnings."
    },
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
    hubVisible: false,
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
    hubVisible: false,
    acceptsGrowContext: true,
    capabilityKey: CAPABILITY_KEYS.TOOL_NPK,
    internalNote:
      "V1 release view inside the nutrient system. Uses starter source categories and keeps provenance expansion in the ingredient library backlog."
  },
  {
    key: "tools.product_ingredient_library",
    title: "Products & Label Library",
    description:
      "Create and manage nutrient, amendment, soil, and input records for recipes and grow planning.",
    area: "water_nutrients",
    status: "release",
    href: "/home/personal/tools/ingredient-library",
    hubVisible: false,
    capabilityKey: CAPABILITY_KEYS.TOOL_NPK,
    experience: {
      mode: "library",
      aiCredits: "never",
      grow: "not_needed",
      audience: "general",
      inputSummary:
        "Product labels, nutrient forms, source confidence, and optional evidence.",
      outputSummary:
        "Reusable ingredient records for mix builders, comparisons, and revisions."
    },
    internalNote:
      "V1 release CRUD surface for user-entered ingredients with label N-P2O5-K2O, source confidence, favorites, and archive support."
  },
  {
    key: "tools.watering",
    title: "Watering Planner",
    description:
      "Create watering, dryback, pot-weight, and runoff check tasks from medium, stage, and environment.",
    area: "water_nutrients",
    status: "release",
    href: "/home/personal/tools/watering",
    hubVisible: false,
    acceptsGrowContext: true,
    internalNote: "Heuristic estimate; history and substrate measurements remain."
  },
  {
    key: "tools.environment_analysis",
    title: "Environment Review",
    description:
      "Review temperature, humidity, VPD, PPFD, DLI, and CO2 context with free GrowPath rules.",
    area: "environment",
    status: "release",
    href: "/home/personal/tools/environment-analysis",
    acceptsGrowContext: true,
    experience: {
      mode: "calculated",
      aiCredits: "never",
      grow: "optional",
      audience: "general",
      inputSummary:
        "Measured temperature, humidity, leaf temperature, light, CO2, and stage.",
      outputSummary:
        "A rule-based environment review, conflicts, assumptions, and follow-up tasks."
    },
    internalNote: "Rule-based ToolRun review is available without spending AI credits."
  },
  {
    key: "tools.feeding_schedule",
    title: "Feeding Schedule",
    description:
      "Create feed, topdress, water-in, pH/EC check, and plant-response tasks from nutrient and grow-medium context.",
    area: "water_nutrients",
    status: "release",
    href: "/home/personal/tools/feeding-schedule",
    hubVisible: false,
    acceptsGrowContext: true,
    capabilityKey: CAPABILITY_KEYS.FEEDING_SCHEDULE,
    internalNote:
      "Uses the backend feeding schedule endpoint when available and local stage-aware planning otherwise."
  },
  {
    key: "tools.timeline_planner",
    title: "Timeline Planner",
    description:
      "Schedule grow-stage, transplant, flip, IPM, harvest, dry, and cure tasks.",
    area: "planning_records",
    status: "release",
    href: "/home/personal/tools/timeline-planner",
    hubVisible: false,
    acceptsGrowContext: true,
    capabilityKey: CAPABILITY_KEYS.TOOL_TIMELINE_PLANNER,
    internalNote:
      "Local milestone builder can create grow tasks when grow context is present."
  },
  {
    key: "tools.pdf_export",
    title: "Grow Reports & Export",
    description:
      "Export grow timeline, journal, diagnosis, tool run, harvest, pheno, and comparison reports from the records they belong to.",
    area: "planning_records",
    status: "release",
    href: "/home/personal/tools/pdf-export",
    hubVisible: false,
    acceptsGrowContext: true,
    capabilityKey: CAPABILITY_KEYS.TOOL_PDF_EXPORT,
    internalNote:
      "Owned by Grows and Profile, not AI Tools. CSV package supports browser download and native share. Rendered PDF remains tracked separately."
  },
  {
    key: "tools.pheno_matrix",
    title: "Pheno Matrix",
    description: "Score phenotype candidates, weight traits, and rank keeper selections.",
    area: "genetics",
    status: "beta",
    href: "/home/personal/tools/pheno-matrix",
    hubVisible: false,
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
    experience: {
      mode: "ai",
      aiCredits: "required",
      grow: "optional",
      audience: "general",
      inputSummary:
        "Clear whole-plant and close-up photos plus symptoms and measured conditions.",
      outputSummary:
        "Cautious issue candidates, visible evidence, counter-evidence, and next checks."
    },
    internalNote:
      "Vision path works when configured; full ETGU intake and follow-up remain."
  },
  {
    key: "tools.ai_assistant",
    title: "Ask AI",
    description: "Ask grow questions with optional grow context and save AI drafts.",
    area: "plant_health",
    status: "release",
    href: "/home/personal/ai",
    acceptsGrowContext: true,
    capabilityKey: CAPABILITY_KEYS.AI_ASSISTANT,
    experience: {
      mode: "ai",
      aiCredits: "optional",
      grow: "optional",
      audience: "general",
      inputSummary:
        "A question plus any selected grow, plant, records, or uploaded evidence.",
      outputSummary:
        "A context-aware answer with limitations and reviewable task or log drafts."
    },
    internalNote:
      "Primary personal AI interface for grow-aware questions, task drafts, and log drafts."
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
    title: "Soil Mix Builder",
    description:
      "Build science-based soil mixes from physical structure, compost uncertainty, buffering, biology, verified amendments, and release timing.",
    area: "water_nutrients",
    status: "beta",
    href: "/home/personal/tools/soil-builder",
    hubVisible: false,
    acceptsGrowContext: true,
    capabilityKey: CAPABILITY_KEYS.TOOL_NPK,
    experience: {
      mode: "ai_assisted",
      aiCredits: "optional",
      grow: "optional",
      audience: "general",
      inputSummary:
        "Batch size, base media, compost, amendments, labels, and intended use.",
      outputSummary:
        "Scaled soil recipe, physical balance, release timing, risks, and rest plan."
    },
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
    hubVisible: false,
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
    hubVisible: false,
    acceptsGrowContext: true,
    capabilityKey: CAPABILITY_KEYS.TOOL_NPK,
    internalNote:
      "Task-owned planner surfaced from Personal Tasks and grow Tasks. Wired to ToolRun, grow context, logs, tasks, and release timing warnings."
  },
  {
    key: "tools.ph_ec_adjustment",
    title: "pH / EC Range Check",
    description: "Check input/runoff pH and EC with safe adjustment warnings.",
    area: "water_nutrients",
    status: "beta",
    href: "/home/personal/tools/ph-ec",
    hubVisible: false,
    acceptsGrowContext: true,
    capabilityKey: CAPABILITY_KEYS.TOOL_NPK,
    internalNote:
      "Small AI/support calculator hidden from user discovery. It does not recommend exact pH up/down dosing without product concentration."
  },
  {
    key: "tools.crop_steering_projects",
    title: "Crop Steering Projects",
    description:
      "Track P0/P1/P2/P3, dryback, runoff, substrate EC, and steering response.",
    area: "crop_management",
    status: "beta",
    href: "/home/personal/tools/crop-steering-project",
    hubVisible: false,
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
    hubVisible: false,
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
    hubVisible: false,
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
    hubVisible: false,
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
    hubVisible: false,
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
    hubVisible: false,
    acceptsGrowContext: true,
    experience: {
      mode: "ai_assisted",
      aiCredits: "optional",
      grow: "required",
      audience: "cannabis_context",
      inputSummary:
        "Measured room temperature/RH, optional coldest-surface temperature, equilibrated container RH, duration, sensor/time, airflow, density, and representative observations.",
      outputSummary:
        "Evidence readiness, air dew point, measured surface margin, condensation signal, moisture concerns, limitations, and repeat-check tasks."
    },
    internalNote:
      "Approved beta cannabis/hemp dry/cure workflow wired to API-gated grow context, measured evidence, harvest batches, ToolRuns, log summaries, and check tasks."
  },
  {
    key: "tools.clone_rooting",
    title: "Clone Rooting Troubleshooter",
    description: "Check clone rooting conditions, bottlenecks, and follow-up tasks.",
    area: "plant_health",
    status: "beta",
    href: "/home/personal/tools/clone-rooting",
    hubVisible: false,
    acceptsGrowContext: true,
    internalNote:
      "Approved beta clone-room workflow wired to grow context, saved ToolRuns, and follow-up tasks."
  },
  {
    key: "tools.ipm_scout",
    title: "IPM Scout / Pest & Organism Tool",
    description:
      "Rank cautious pest and disease hypotheses from repeatable scouting evidence, then track decisions and outcomes.",
    area: "plant_health",
    status: "beta",
    href: "/home/personal/tools/ipm-scout",
    acceptsGrowContext: true,
    experience: {
      mode: "ai_assisted",
      aiCredits: "optional",
      grow: "optional",
      audience: "general",
      inputSummary:
        "Crop/zone, affected-plant counts, distribution, progression, underside and magnification findings, dated trap context, environment, and clear photos.",
      outputSummary:
        "Readiness, ranked working hypotheses, supporting/counter-evidence, safe IPM categories, an explicitly priced GPT comparison, decisions, and repeat-scout tasks."
    },
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
    experience: {
      mode: "ai_assisted",
      aiCredits: "optional",
      grow: "not_needed",
      audience: "general",
      inputSummary:
        "One or more clear plant photos; a grow can be attached but is not required.",
      outputSummary:
        "A draft crop/species identity, visible traits, confidence, and better-photo guidance."
    },
    internalNote:
      "Approved beta crop-context workflow. Regional invasive alerts stay out of current programming."
  },
  {
    key: "tools.harvest_readiness_ai",
    title: "Harvest Readiness Calculator",
    description:
      "Estimate harvest readiness from maturity signals, photos, cultivar timing, and user goals.",
    area: "planning_records",
    status: "beta",
    href: "/home/personal/tools/harvest-readiness",
    hubVisible: true,
    acceptsGrowContext: true,
    experience: {
      mode: "ai_assisted",
      aiCredits: "optional",
      grow: "required",
      audience: "cannabis_context",
      inputSummary:
        "Cannabis grow timing, maturity signals, goals, and sharp trichome photos.",
      outputSummary:
        "Photo usability, maturity estimate, uncertainty, retake guidance, and decision tasks."
    },
    internalNote:
      "Approved beta harvest-readiness workflow. Keep the shared calculator visible in Personal Tools for cannabis-enabled users and link the same route contextually from cannabis grows."
  },
  {
    key: "tools.run_comparison",
    title: "Run-To-Run Comparison",
    description:
      "Compare grows by yield, timing, issues, environment, feeding, quality, and keeper score.",
    area: "planning_records",
    status: "beta",
    href: "/home/personal/tools/run-comparison",
    hubVisible: false,
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
    hubVisible: false,
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
    href: "/home/commercial/tools/soil-nutrient-batch",
    hubVisible: false,
    internalNote:
      "Commercial-only beta production workflow. Keep it out of the Personal tools hub and preserve workspace-scoped batch, cost, inventory, and product records."
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
];

export function isFeatureNavigable(
  feature: Pick<FeatureDefinition, "status" | "href">,
  options: { allowBetaSurfaces?: boolean } = {}
) {
  if (!feature.href) return false;
  if (feature.status === "release") return true;
  return feature.status === "beta" && options.allowBetaSurfaces === true;
}

export function getNavigablePersonalTools(options: { allowBetaSurfaces?: boolean } = {}) {
  return (personalToolFeatures as readonly FeatureDefinition[]).filter(
    (feature) => feature.hubVisible !== false && isFeatureNavigable(feature, options)
  );
}
