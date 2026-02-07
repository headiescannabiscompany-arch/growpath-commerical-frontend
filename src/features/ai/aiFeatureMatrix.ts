/**
 * AI Feature Matrix
 *
 * Single source of truth for all AI tools, their UI type, requirements, and persistence.
 * Add a new feature here → it appears in the catalog automatically.
 * Flip enabled: true/false to control shipping.
 */

export type AITool = "harvest" | "climate" | "ec";
export type AIFunction =
  | "analyzeTrichomes"
  | "estimateHarvestWindow"
  | "computeVPD"
  | "recommendCorrection";

export type AIWriteType =
  | "TrichomeAnalysis"
  | "HarvestDecision"
  | "CalendarEvent"
  | "Task";

export type AIUIKind = "form" | "metric" | "wizard";

export type AIFeature = {
  id: string;
  label: string;
  description: string;
  tool: AITool;
  fn: AIFunction;
  enabled: boolean; // shipping toggle
  ui: AIUIKind;

  // Navigation route name inside the AI stack
  screen: string;

  // What context must exist to run this feature
  requires: {
    facilityId: boolean;
    growId: boolean;
  };

  // What persisted writes to expect (for audit / UX)
  writes?: AIWriteType[];

  // (Optional) Expected write counts per type (for clarity)
  writeCounts?: Partial<Record<AIWriteType, number>>;
};

export const AI_FEATURES: AIFeature[] = [
  {
    id: "harvest-trichomes",
    label: "Analyze Trichomes",
    description: "Identify trichome distribution from images",
    tool: "harvest",
    fn: "analyzeTrichomes",
    enabled: true,
    ui: "wizard",
    screen: "TrichomeAnalysis",
    requires: { facilityId: true, growId: true },
    writes: ["TrichomeAnalysis"],
    writeCounts: { TrichomeAnalysis: 1 }
  },
  {
    id: "harvest-window",
    label: "Estimate Harvest Window",
    description: "Calculate harvest dates from trichome distribution",
    tool: "harvest",
    fn: "estimateHarvestWindow",
    enabled: true,
    ui: "form",
    screen: "HarvestWindow",
    requires: { facilityId: true, growId: true },
    writes: ["HarvestDecision", "CalendarEvent"],
    writeCounts: { HarvestDecision: 1, CalendarEvent: 3 }
  },

  // Phase 1.1 (ready to flip on once you want)
  {
    id: "climate-vpd",
    label: "Compute VPD",
    description: "Calculate vapor pressure deficit from temp & RH",
    tool: "climate",
    fn: "computeVPD",
    enabled: false,
    ui: "metric",
    screen: "ComputeVPD",
    requires: { facilityId: true, growId: false }
  },
  {
    id: "ec-recommend",
    label: "EC Recommendation",
    description: "Suggest EC correction (may require confirmation gate)",
    tool: "ec",
    fn: "recommendCorrection",
    enabled: false,
    ui: "form",
    screen: "ECRecommend",
    requires: { facilityId: true, growId: false },
    writes: ["Task"],
    writeCounts: { Task: 1 }
  }
];
