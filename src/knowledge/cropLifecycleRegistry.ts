export type ReviewedCropLifecycle = {
  id: string;
  scientificName: string;
  commonNames: string[];
  lifeSpanPath: "climate_dependent_perennial" | "unknown";
  productionPattern: "cultivar_dependent" | "unknown";
  dormancyPattern: "climate_dependent" | "unknown";
  requiredQuestions: string[];
  guidance: string[];
  sourceIds: string[];
  reviewedAt: string;
};

export const reviewedCropLifecycleRegistry: ReviewedCropLifecycle[] = [
  {
    id: "tomato-solanum-lycopersicum-lifecycle-v1",
    scientificName: "Solanum lycopersicum",
    commonNames: ["tomato", "garden tomato"],
    lifeSpanPath: "climate_dependent_perennial",
    productionPattern: "cultivar_dependent",
    dormancyPattern: "climate_dependent",
    requiredQuestions: [
      "Is the cultivar determinate, indeterminate, or unknown?",
      "Will it grow outdoors for one frost-limited season or in protected perennial conditions?",
      "Was it started from seed, transplanted, or carried over as an established plant?",
      "What region or climate applies to planting and harvest dates?"
    ],
    guidance: [
      "Tomato is a tender herbaceous perennial commonly grown as an annual where cold ends the season.",
      "Determinate cultivars concentrate fruit production; indeterminate cultivars keep flowering and ripening fruit while conditions permit.",
      "Days to first harvest and harvest duration depend on cultivar class, start method, region, and production setting and must not be inferred from the species name alone."
    ],
    sourceIds: [
      "missouri-botanical-garden-plant-finder",
      "extension-penn-state-tomato-production",
      "extension-minnesota-tomato-growing",
      "extension-minnesota-vegetable-planning"
    ],
    reviewedAt: "2026-08-14"
  }
];

function normalized(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function findReviewedCropLifecycle(input: {
  scientificName?: string;
  commonName?: string;
}) {
  const scientificName = normalized(input.scientificName);
  const commonName = normalized(input.commonName);
  return reviewedCropLifecycleRegistry.find(
    (entry) =>
      (scientificName && normalized(entry.scientificName) === scientificName) ||
      (commonName && entry.commonNames.some((name) => normalized(name) === commonName))
  );
}
