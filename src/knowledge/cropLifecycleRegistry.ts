export type ReviewedCropLifecycle = {
  id: string;
  scientificName: string;
  commonNames: string[];
  lifeSpanPath:
    | "annual"
    | "biennial"
    | "short_lived_perennial"
    | "long_lived_perennial"
    | "continuous_tropical"
    | "finite_cycle"
    | "climate_dependent_perennial"
    | "unknown";
  productionPattern:
    | "single_harvest"
    | "repeat_harvest"
    | "seasonal_perennial"
    | "continuous"
    | "non_harvest_observation"
    | "cultivar_dependent"
    | "unknown";
  dormancyPattern: "none" | "seasonal" | "climate_dependent" | "unknown";
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
  },
  {
    id: "basil-ocimum-basilicum-lifecycle-v1",
    scientificName: "Ocimum basilicum",
    commonNames: ["basil", "sweet basil", "garden basil"],
    lifeSpanPath: "annual",
    productionPattern: "repeat_harvest",
    dormancyPattern: "none",
    requiredQuestions: [
      "Was the plant started from seed, transplanted, or carried indoors as an established plant?",
      "Is the goal repeated leaf harvest, flowering, seed production, or observation?",
      "Will it grow outdoors in a frost-limited season or under protected indoor conditions?"
    ],
    guidance: [
      "Sweet basil is managed as a tender annual; carrying it indoors does not make it an indefinite perennial crop plan.",
      "Leaf and stem harvests can repeat while healthy vegetative growth continues.",
      "Flowering and seed formation change the production goal, so harvest timing must follow the grower's intended use rather than a universal day count."
    ],
    sourceIds: [
      "extension-minnesota-growing-basil",
      "extension-minnesota-vegetable-harvest"
    ],
    reviewedAt: "2026-08-20"
  },
  {
    id: "lettuce-lactuca-sativa-lifecycle-v1",
    scientificName: "Lactuca sativa",
    commonNames: ["lettuce", "garden lettuce", "leaf lettuce", "head lettuce"],
    lifeSpanPath: "annual",
    productionPattern: "cultivar_dependent",
    dormancyPattern: "none",
    requiredQuestions: [
      "Is this a head, romaine, butterhead, leaf, baby-leaf, or other lettuce type?",
      "Will the grow use whole-head harvest, repeated outer-leaf harvest, or succession plantings?",
      "What seasonal temperatures and region apply to the crop?"
    ],
    guidance: [
      "Lettuce is a cool-season annual crop; heat and long days can trigger bolting and end a useful leaf harvest.",
      "Whole-head harvest is a single-plant endpoint, while carefully picked leaf lettuce may support multiple harvests.",
      "A succession of separate plantings is not one plant's continuous lifecycle and should remain distinct in planning history."
    ],
    sourceIds: ["extension-minnesota-growing-lettuce"],
    reviewedAt: "2026-08-20"
  },
  {
    id: "strawberry-fragaria-ananassa-lifecycle-v1",
    scientificName: "Fragaria × ananassa",
    commonNames: ["strawberry", "garden strawberry"],
    lifeSpanPath: "climate_dependent_perennial",
    productionPattern: "cultivar_dependent",
    dormancyPattern: "climate_dependent",
    requiredQuestions: [
      "Is the cultivar June-bearing, ever-bearing, day-neutral, or unknown?",
      "Is it managed as a perennial matted row, an annual production bed, a container, or another system?",
      "What winter conditions, protection, and region apply to dormancy and survival?"
    ],
    guidance: [
      "June-bearing and day-neutral strawberries use different production schedules and should not share one automatic harvest pattern.",
      "June-bearing systems may remain perennial for several seasons, while commercial day-neutral systems are often replanted annually.",
      "Flowering, harvest duration, renovation, runner management, and winter protection depend on cultivar type and production system."
    ],
    sourceIds: [
      "extension-minnesota-strawberry-systems",
      "extension-minnesota-growing-strawberries"
    ],
    reviewedAt: "2026-08-20"
  },
  {
    id: "apple-malus-domestica-lifecycle-v1",
    scientificName: "Malus domestica",
    commonNames: ["apple", "apple tree", "domestic apple"],
    lifeSpanPath: "long_lived_perennial",
    productionPattern: "seasonal_perennial",
    dormancyPattern: "seasonal",
    requiredQuestions: [
      "What scion cultivar and rootstock are present, if known?",
      "Is the tree newly planted, established but non-bearing, or bearing?",
      "Is a compatible pollinizer within range?",
      "What region, hardiness, and seasonal dormancy conditions apply?"
    ],
    guidance: [
      "Apple is a woody perennial with recurring seasonal growth, dormancy, bloom, fruit development, and harvest.",
      "Rootstock and scion affect mature size, years to bearing, training, and management, so the species name alone cannot set a first-harvest date.",
      "Pollination context, annual pruning, thinning, and cultivar-specific maturity belong in the long-term grow history."
    ],
    sourceIds: ["extension-minnesota-growing-apples"],
    reviewedAt: "2026-08-20"
  },
  {
    id: "pothos-epipremnum-aureum-lifecycle-v1",
    scientificName: "Epipremnum aureum",
    commonNames: ["pothos", "golden pothos", "devil's ivy"],
    lifeSpanPath: "long_lived_perennial",
    productionPattern: "non_harvest_observation",
    dormancyPattern: "none",
    requiredQuestions: [
      "Is this an established plant, rooted cutting, fresh cutting, or division?",
      "What cultivar is present, if known?",
      "Is the goal foliage growth, propagation, training, rehabilitation, or observation?"
    ],
    guidance: [
      "Pothos is a long-lived tropical foliage houseplant rather than a one-season harvest crop.",
      "Stem cuttings, layering, and division are distinct starting methods and should remain in the grow history.",
      "Light, container, pruning, and repotting context matter more than a promised harvest date."
    ],
    sourceIds: ["extension-penn-state-pothos-houseplant"],
    reviewedAt: "2026-08-20"
  },
  {
    id: "marigold-tagetes-ornamental-lifecycle-v1",
    scientificName: "Tagetes species",
    commonNames: ["marigold", "french marigold", "african marigold", "signet marigold"],
    lifeSpanPath: "annual",
    productionPattern: "cultivar_dependent",
    dormancyPattern: "none",
    requiredQuestions: [
      "Which marigold species or type is being grown, if known?",
      "Is the goal landscape bloom, cut flowers, edible signet flowers, seed, or observation?",
      "Was it direct-seeded or transplanted, and what local frost season applies?"
    ],
    guidance: [
      "Common ornamental marigolds are managed as annuals and can bloom through the frost-free season.",
      "French, African, and Signet types differ in size and use, so the common name alone cannot set spacing or harvest behavior.",
      "Bloom and cut-flower planning depends on the selected type, start method, and local season."
    ],
    sourceIds: ["extension-minnesota-marigolds"],
    reviewedAt: "2026-08-20"
  },
  {
    id: "radish-microgreens-raphanus-sativus-lifecycle-v1",
    scientificName: "Raphanus sativus",
    commonNames: ["radish microgreens", "daikon microgreens", "radish microgreen"],
    lifeSpanPath: "annual",
    productionPattern: "single_harvest",
    dormancyPattern: "none",
    requiredQuestions: [
      "Which radish cultivar or seed lot is being used?",
      "Is this a microgreen tray rather than a root-radish crop?",
      "What seeding date, tray, medium, and environment apply?"
    ],
    guidance: [
      "A microgreen tray is a short seed-to-cut production cycle, not the complete mature radish lifecycle.",
      "The tray is normally cut once; a new seeding should become a new cycle rather than continuing the harvested plants.",
      "Days to harvest vary with species, cultivar, and environment and remain an editable planning estimate."
    ],
    sourceIds: ["extension-penn-state-growing-microgreens"],
    reviewedAt: "2026-08-20"
  },
  {
    id: "button-mushroom-agaricus-bisporus-lifecycle-v1",
    scientificName: "Agaricus bisporus",
    commonNames: ["button mushroom", "white button mushroom", "cremini", "portobello"],
    lifeSpanPath: "finite_cycle",
    productionPattern: "repeat_harvest",
    dormancyPattern: "none",
    requiredQuestions: [
      "Is the input pure-culture spawn, an inoculated block, or another documented starting material?",
      "Which strain, substrate, casing, and production system are being used?",
      "Will separate flushes be recorded within one substrate cycle?"
    ],
    guidance: [
      "Button mushroom production is a finite fungal substrate cycle, not an annual or perennial plant lifecycle.",
      "Spawn colonization, casing, pinning, repeated flushes, and spent-substrate termination are distinct stages.",
      "Published production timing is system-specific and must not become an automatic home- or facility-grow guarantee."
    ],
    sourceIds: ["extension-penn-state-mushroom-production"],
    reviewedAt: "2026-08-20"
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
