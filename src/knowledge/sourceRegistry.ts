export type SourceReliabilityTier = "A" | "B" | "C" | "D";

export type SourceUseCase =
  | "diagnosis"
  | "ipm"
  | "soil_science"
  | "nutrient_chemistry"
  | "fertilizer_label"
  | "water_quality"
  | "cultivar_parentage"
  | "breeder_claim"
  | "lab_result"
  | "market_menu"
  | "consumer_review"
  | "commercial_product"
  | "legal_regulatory"
  | "device_api"
  | "post_harvest"
  | "education";

export type SourceType =
  | "university_extension"
  | "government"
  | "peer_reviewed"
  | "lab_coa"
  | "manufacturer"
  | "breeder"
  | "dispensary_menu"
  | "forum"
  | "consumer_database"
  | "grower_media"
  | "seo_blog"
  | "internal_growpath_method"
  | "user_observation";

export interface SourceRegistryEntry {
  id: string;
  name: string;
  domain?: string;
  sourceType: SourceType;
  reliabilityTier: SourceReliabilityTier;
  trustedFor: SourceUseCase[];
  notTrustedFor: SourceUseCase[];
  notes: string;
  requiresCrossCheck: boolean;
  preferredCrossCheckSources?: string[];
  lastReviewedAt?: string;
}

const horticulture = [
  "ipm",
  "soil_science",
  "nutrient_chemistry",
  "water_quality",
  "education"
] as SourceUseCase[];

export const sourceRegistry: SourceRegistryEntry[] = [
  {
    id: "uc-ipm",
    name: "UC Integrated Pest Management",
    domain: "ipm.ucanr.edu",
    sourceType: "university_extension",
    reliabilityTier: "A",
    trustedFor: ["ipm", "diagnosis", "education"],
    notTrustedFor: ["cultivar_parentage", "breeder_claim", "consumer_review"],
    notes: "Primary IPM and pest/disease principle source.",
    requiresCrossCheck: false,
    lastReviewedAt: "2026-07-18"
  },
  {
    id: "usda-aphis",
    name: "USDA APHIS",
    domain: "aphis.usda.gov",
    sourceType: "government",
    reliabilityTier: "A",
    trustedFor: ["ipm", "legal_regulatory", "education"],
    notTrustedFor: ["breeder_claim", "consumer_review"],
    notes:
      "Plant-health and regulatory authority within jurisdiction and publication scope.",
    requiresCrossCheck: false,
    lastReviewedAt: "2026-07-18"
  },
  ...[
    "cornell",
    "penn-state",
    "nc-state",
    "maryland",
    "oregon-state",
    "colorado-state",
    "clemson",
    "virginia-tech"
  ].map(
    (id): SourceRegistryEntry => ({
      id: `extension-${id}`,
      name: `${id.replaceAll("-", " ")} extension`,
      sourceType: "university_extension",
      reliabilityTier: "A",
      trustedFor: horticulture,
      notTrustedFor: ["cultivar_parentage", "breeder_claim", "market_menu"],
      notes: "Use within crop, climate, jurisdiction and publication scope.",
      requiresCrossCheck: false,
      lastReviewedAt: "2026-07-18"
    })
  ),
  {
    id: "pmc9404914-postharvest-review",
    name: "Postharvest Operations of Cannabis and Their Effect on Cannabinoid Content",
    domain: "pmc.ncbi.nlm.nih.gov",
    sourceType: "peer_reviewed",
    reliabilityTier: "A",
    trustedFor: ["post_harvest", "education"],
    notTrustedFor: ["legal_regulatory", "lab_result", "diagnosis"],
    notes:
      "Supports method-dependent drying variability and post-harvest process factors; does not establish one universal completion day.",
    requiresCrossCheck: false,
    lastReviewedAt: "2026-07-21"
  },
  {
    id: "pmid-6643-cannabis-storage-light",
    name: "The stability of cannabis and its preparations on storage",
    domain: "pubmed.ncbi.nlm.nih.gov",
    sourceType: "peer_reviewed",
    reliabilityTier: "A",
    trustedFor: ["post_harvest", "education"],
    notTrustedFor: ["legal_regulatory", "lab_result", "diagnosis"],
    notes:
      "Supports protecting cannabis material from light as a cannabinoid-quality measure; not a mold or safety determination.",
    requiresCrossCheck: false,
    lastReviewedAt: "2026-07-21"
  },
  {
    id: "owner-observation-dry-window-2026-07-21",
    name: "Owner drying-window observation (2026-07-21)",
    sourceType: "user_observation",
    reliabilityTier: "B",
    trustedFor: ["post_harvest", "education"],
    notTrustedFor: ["lab_result", "legal_regulatory", "diagnosis"],
    notes:
      "Planning observation: controlled drying commonly targets 10-14 days; hot, fast, low-humidity drying may reach an endpoint in 5-7 days with quality concerns; longer than 14 days can occur but is not recommended as routine. Never use elapsed time alone as completion evidence.",
    requiresCrossCheck: true,
    preferredCrossCheckSources: [
      "pmc9404914-postharvest-review",
      "pmid-6643-cannabis-storage-light"
    ],
    lastReviewedAt: "2026-07-21"
  },
  {
    id: "official-product-label",
    name: "Official product or safety label",
    sourceType: "manufacturer",
    reliabilityTier: "A",
    trustedFor: ["fertilizer_label", "nutrient_chemistry", "commercial_product"],
    notTrustedFor: ["consumer_review", "diagnosis"],
    notes:
      "Authoritative for the named label version, guaranteed analysis and legal/safety text; not proof of superiority.",
    requiresCrossCheck: false,
    lastReviewedAt: "2026-07-18"
  },
  {
    id: "credible-lab-coa",
    name: "Credible batch-specific laboratory COA",
    sourceType: "lab_coa",
    reliabilityTier: "A",
    trustedFor: ["lab_result"],
    notTrustedFor: ["breeder_claim", "diagnosis", "consumer_review"],
    notes: "Valid only for the named lab, method, sample, batch and date.",
    requiresCrossCheck: false,
    lastReviewedAt: "2026-07-18"
  },
  {
    id: "manufacturer-site",
    name: "Manufacturer website or datasheet",
    sourceType: "manufacturer",
    reliabilityTier: "B",
    trustedFor: ["fertilizer_label", "device_api", "commercial_product"],
    notTrustedFor: ["consumer_review", "diagnosis"],
    notes:
      "Official specifications/claims; cross-check label, manual or independent performance evidence.",
    requiresCrossCheck: true,
    preferredCrossCheckSources: ["official-product-label"],
    lastReviewedAt: "2026-07-18"
  },
  {
    id: "breeder-site",
    name: "Official breeder website",
    sourceType: "breeder",
    reliabilityTier: "B",
    trustedFor: ["cultivar_parentage", "breeder_claim"],
    notTrustedFor: ["diagnosis", "lab_result", "consumer_review"],
    notes: "Treat parentage and timing as breeder claims, never guarantees.",
    requiresCrossCheck: true,
    lastReviewedAt: "2026-07-18"
  },
  {
    id: "consumer-cultivar-database",
    name: "Consumer cultivar database",
    sourceType: "consumer_database",
    reliabilityTier: "C",
    trustedFor: ["consumer_review", "market_menu"],
    notTrustedFor: ["diagnosis", "nutrient_chemistry", "cultivar_parentage"],
    notes: "Lead and market-language source only.",
    requiresCrossCheck: true,
    preferredCrossCheckSources: ["breeder-site", "credible-lab-coa"],
    lastReviewedAt: "2026-07-18"
  },
  {
    id: "grower-forum",
    name: "Grow forum, Reddit, Discord or grower video",
    sourceType: "forum",
    reliabilityTier: "C",
    trustedFor: ["consumer_review", "education"],
    notTrustedFor: [
      "diagnosis",
      "legal_regulatory",
      "fertilizer_label",
      "cultivar_parentage"
    ],
    notes: "Anecdotal pattern/lead source. Preserve context and cross-check.",
    requiresCrossCheck: true,
    lastReviewedAt: "2026-07-18"
  },
  {
    id: "seo-affiliate-blog",
    name: "SEO or affiliate grow blog",
    sourceType: "seo_blog",
    reliabilityTier: "D",
    trustedFor: [],
    notTrustedFor: [
      "diagnosis",
      "ipm",
      "soil_science",
      "nutrient_chemistry",
      "legal_regulatory"
    ],
    notes: "Marketing context only unless independently verified.",
    requiresCrossCheck: true,
    lastReviewedAt: "2026-07-18"
  },
  {
    id: "growpath-method",
    name: "GrowPathAI internal method",
    sourceType: "internal_growpath_method",
    reliabilityTier: "A",
    trustedFor: ["diagnosis", "ipm", "soil_science", "nutrient_chemistry", "education"],
    notTrustedFor: ["lab_result", "legal_regulatory"],
    notes:
      "Workflow authority, not a substitute for measurements, labels, laboratories or regulators.",
    requiresCrossCheck: true,
    lastReviewedAt: "2026-07-18"
  },
  {
    id: "user-observation",
    name: "User observation or grow record",
    sourceType: "user_observation",
    reliabilityTier: "B",
    trustedFor: ["diagnosis", "ipm", "consumer_review", "education"],
    notTrustedFor: ["lab_result", "fertilizer_label", "legal_regulatory"],
    notes: "Primary evidence of what was observed; not automatic proof of cause.",
    requiresCrossCheck: true,
    lastReviewedAt: "2026-07-18"
  }
];

export function getSourceEntry(id: string) {
  return sourceRegistry.find((source) => source.id === id);
}

export function sourceSupportsUseCase(
  source: SourceRegistryEntry,
  useCase: SourceUseCase
) {
  return source.trustedFor.includes(useCase) && !source.notTrustedFor.includes(useCase);
}
