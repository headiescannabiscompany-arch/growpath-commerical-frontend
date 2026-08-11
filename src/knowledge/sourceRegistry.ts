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
  | "grow_history"
  | "propagation"
  | "tissue_culture"
  | "course_media"
  | "education"
  | "qa_evaluation"
  | "photo_quality_guidance"
  | "platform_data_access"
  | "plant_identification";

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
  | "botanical_database"
  | "provider_documentation"
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
  "propagation",
  "education",
  "plant_identification"
] as SourceUseCase[];

export const sourceRegistry: SourceRegistryEntry[] = [
  {
    id: "meta-automated-data-collection-terms",
    name: "Meta Automated Data Collection Terms and Facebook Terms",
    domain: "facebook.com",
    sourceType: "provider_documentation",
    reliabilityTier: "B",
    trustedFor: ["platform_data_access"],
    notTrustedFor: ["diagnosis", "ipm", "lab_result", "legal_regulatory"],
    notes:
      "Provider authority for Meta's permission boundary: automated collection is prohibited without prior express authorization. It does not grant content rights, creator permission, private-group access, or permission to use collected content for GrowPath QA or training.",
    requiresCrossCheck: true,
    lastReviewedAt: "2026-07-25"
  },
  {
    id: "youtube-player-documentation",
    name: "YouTube Embedded Players and API documentation",
    domain: "developers.google.com",
    sourceType: "provider_documentation",
    reliabilityTier: "B",
    trustedFor: ["course_media"],
    notTrustedFor: ["diagnosis", "lab_result", "legal_regulatory"],
    notes:
      "Provider authority for player URL behavior and provider-side data-sharing constraints; not evidence that an individual video is available, embeddable, licensed, captioned, or suitable.",
    requiresCrossCheck: true,
    lastReviewedAt: "2026-07-22"
  },
  {
    id: "crime-pays-but-botany-doesnt",
    name: "Crime Pays But Botany Doesn't",
    domain: "youtube.com",
    sourceType: "grower_media",
    reliabilityTier: "C",
    trustedFor: ["education", "qa_evaluation", "photo_quality_guidance"],
    notTrustedFor: ["plant_identification", "diagnosis", "ipm", "legal_regulatory"],
    notes:
      "Educational and QA context for field observation vocabulary, plant-family pattern recognition, morphology, ecology, and candidate discriminating questions. Do not copy or retain videos, audio, frames, transcripts, or thumbnails without creator permission. A host identification is not GrowPath ground truth and cannot solely support species confirmation, diagnosis, treatment, toxicity, edibility, or legal status.",
    requiresCrossCheck: true,
    preferredCrossCheckSources: [
      "usda-plants-database",
      "kew-powo",
      "gbif-species-api",
      "inaturalist-observations",
      "extension-penn-state"
    ],
    lastReviewedAt: "2026-07-25"
  },
  {
    id: "usda-plants-database",
    name: "USDA NRCS PLANTS Database",
    domain: "plants.usda.gov",
    sourceType: "government",
    reliabilityTier: "A",
    trustedFor: ["plant_identification", "education"],
    notTrustedFor: ["diagnosis", "ipm", "consumer_review"],
    notes:
      "Government plant taxonomy, distribution, documentation, and representative-morphology context. Exact identification still requires adequate characters and appropriate keys or expert/herbarium confirmation within the record's scope.",
    requiresCrossCheck: false,
    lastReviewedAt: "2026-07-25"
  },
  {
    id: "gbif-species-api",
    name: "Global Biodiversity Information Facility Species and Occurrence APIs",
    domain: "gbif.org",
    sourceType: "botanical_database",
    reliabilityTier: "A",
    trustedFor: ["plant_identification", "education"],
    notTrustedFor: ["diagnosis", "ipm", "legal_regulatory"],
    notes:
      "Institutional taxonomy-backbone and occurrence-record context for candidate names and geographic plausibility. Individual occurrence identifications, coordinates, and dataset records retain their own evidence quality and must not be treated as visual species confirmation.",
    requiresCrossCheck: true,
    preferredCrossCheckSources: ["kew-powo", "usda-plants-database"],
    lastReviewedAt: "2026-07-27"
  },
  {
    id: "kew-powo",
    name: "Royal Botanic Gardens, Kew — Plants of the World Online",
    domain: "powo.science.kew.org",
    sourceType: "botanical_database",
    reliabilityTier: "A",
    trustedFor: ["plant_identification", "education"],
    notTrustedFor: ["diagnosis", "ipm", "legal_regulatory"],
    notes:
      "Expert-reviewed vascular-plant names, synonymy, distribution, traits, and bibliography using the World Checklist of Vascular Plants backbone. It supports name and range checks, but the user's specimen still needs adequate diagnostic characters, an appropriate flora/key, herbarium evidence, or expert review.",
    requiresCrossCheck: true,
    preferredCrossCheckSources: ["gbif-species-api", "usda-plants-database"],
    lastReviewedAt: "2026-07-27"
  },
  {
    id: "inaturalist-observations",
    name: "iNaturalist Observations and Community Identification",
    domain: "inaturalist.org",
    sourceType: "consumer_database",
    reliabilityTier: "C",
    trustedFor: ["plant_identification", "education", "qa_evaluation"],
    notTrustedFor: ["diagnosis", "ipm", "legal_regulatory"],
    notes:
      "Candidate occurrence, season, lookalike, and community-identification lead. Needs ID, Research Grade, or community agreement is not automatic GrowPath ground truth. Review the specific observation, evidence quality, location precision, taxon agreement, and photo license before use; never treat it as model-training permission.",
    requiresCrossCheck: true,
    preferredCrossCheckSources: ["usda-plants-database", "kew-powo", "gbif-species-api"],
    lastReviewedAt: "2026-07-27"
  },
  {
    id: "wikimedia-commons-licensed-plant-media",
    name: "Wikimedia Commons licensed plant media",
    domain: "commons.wikimedia.org",
    sourceType: "consumer_database",
    reliabilityTier: "C",
    trustedFor: ["qa_evaluation", "photo_quality_guidance", "education"],
    notTrustedFor: ["plant_identification", "diagnosis", "ipm", "legal_regulatory"],
    notes:
      "Plant ID QA candidate media only. Verify every file page and admit only an individually reviewed CC0 1.0 or CC BY 4.0 file with creator, attribution, license link, source page, and original URL retained. Exclude incompatible or unclear rights. A filename, category, caption, or Commons placement is not botanical ground truth; independently review morphology and cross-check the taxon with Tier A sources.",
    requiresCrossCheck: true,
    preferredCrossCheckSources: ["usda-plants-database", "kew-powo", "gbif-species-api"],
    lastReviewedAt: "2026-08-11"
  },
  {
    id: "vimeo-video-privacy-documentation",
    name: "Vimeo video privacy and oEmbed documentation",
    domain: "help.vimeo.com",
    sourceType: "provider_documentation",
    reliabilityTier: "B",
    trustedFor: ["course_media"],
    notTrustedFor: ["diagnosis", "lab_result", "legal_regulatory"],
    notes:
      "Provider authority for Vimeo privacy, domain restrictions, and unlisted privacy hashes; not evidence of an individual video's current availability, rights, or accessibility.",
    requiresCrossCheck: true,
    lastReviewedAt: "2026-07-22"
  },
  {
    id: "uc-ipm",
    name: "UC Integrated Pest Management",
    domain: "ipm.ucanr.edu",
    sourceType: "university_extension",
    reliabilityTier: "A",
    trustedFor: ["ipm", "diagnosis", "education"],
    notTrustedFor: ["cultivar_parentage", "breeder_claim", "consumer_review"],
    notes:
      "Primary IPM and pest/disease principle source. The UC IPM Thrips and Powdery Mildew pages support separating silvering/stippling/scarring and black frass from superficial white-to-gray powdery growth; neither page turns one ambiguous photo into a confirmed diagnosis.",
    requiresCrossCheck: false,
    lastReviewedAt: "2026-08-06"
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
    id: "nc-state-extension-cutting-propagation",
    name: "NC State Extension Gardener Handbook — Propagation",
    domain: "content.ces.ncsu.edu",
    sourceType: "university_extension",
    reliabilityTier: "A",
    trustedFor: ["propagation", "education"],
    notTrustedFor: ["diagnosis", "lab_result", "legal_regulatory"],
    notes:
      "Supports general cutting-propagation principles: high humidity limits water loss, while rooting media should be clean, low fertility, well drained, and moisture retentive. It does not prove roots in an individual cutting or set a cannabis-specific completion day.",
    requiresCrossCheck: false,
    lastReviewedAt: "2026-07-21"
  },
  {
    id: "hort-20250043-cannabis-cutting-environment",
    name: "Light, Temperature, and Relative Humidity Influence the Adventitious Rooting of Cannabis Stem Cuttings",
    domain: "hst-j.org",
    sourceType: "peer_reviewed",
    reliabilityTier: "A",
    trustedFor: ["propagation", "education"],
    notTrustedFor: ["diagnosis", "lab_result", "legal_regulatory"],
    notes:
      "Cannabis-cutting environment study using two Korean hemp cultivars. Use its tested light, temperature, and RH ranges as study context, not universal targets: cultivar response differed and combined environmental effects were not tested.",
    requiresCrossCheck: true,
    preferredCrossCheckSources: ["nc-state-extension-cutting-propagation"],
    lastReviewedAt: "2026-07-21"
  },
  {
    id: "usda-ars-hemp-tissue-culture-protocol-2025",
    name: "USDA ARS Hemp Germplasm Laboratory Tissue Culture Protocol",
    domain: "ars.usda.gov",
    sourceType: "government",
    reliabilityTier: "A",
    trustedFor: ["tissue_culture", "propagation", "education"],
    notTrustedFor: ["diagnosis", "lab_result", "legal_regulatory"],
    notes:
      "Official 2025 hemp germplasm laboratory protocol supporting the Stage 0-4 workflow, sterile handling, contamination controls, rooting, and acclimation context. Its protocol values are not universal production targets or batch release evidence.",
    requiresCrossCheck: true,
    preferredCrossCheckSources: ["frontiers-2021-drug-type-cannabis-tc"],
    lastReviewedAt: "2026-07-21"
  },
  {
    id: "frontiers-2021-drug-type-cannabis-tc",
    name: "Drug-type cannabis micropropagation and cryopreservation study",
    domain: "frontiersin.org",
    sourceType: "peer_reviewed",
    reliabilityTier: "A",
    trustedFor: ["tissue_culture", "propagation", "education"],
    notTrustedFor: ["diagnosis", "lab_result", "legal_regulatory"],
    notes:
      "Primary drug-type cannabis tissue-culture research (DOI 10.3389/fpls.2021.732344) supporting genotype- and protocol-dependent media, contamination, rooting, acclimation, and recovery outcomes. It does not create universal targets or prove an individual batch clean.",
    requiresCrossCheck: true,
    preferredCrossCheckSources: ["usda-ars-hemp-tissue-culture-protocol-2025"],
    lastReviewedAt: "2026-07-21"
  },
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
    id: "facebook-grower-groups",
    name: "Facebook grower posts and groups",
    domain: "facebook.com",
    sourceType: "forum",
    reliabilityTier: "C",
    trustedFor: ["qa_evaluation", "photo_quality_guidance"],
    notTrustedFor: [
      "diagnosis",
      "ipm",
      "legal_regulatory",
      "fertilizer_label",
      "cultivar_parentage",
      "lab_result"
    ],
    notes:
      "Candidate question language, evidence leads, and photo-quality failure examples only. Do not scrape or collect automatically without Meta authorization. Do not use private-group content without group access plus creator permission. A post, comment consensus, like count, or image caption is not a confirmed diagnosis. Copy or retain media only after image-level rights, intended-use, privacy, and de-identification review; never use this source for model training.",
    requiresCrossCheck: true,
    preferredCrossCheckSources: [
      "meta-automated-data-collection-terms",
      "uc-ipm",
      "usda-aphis",
      "growpath-method"
    ],
    lastReviewedAt: "2026-07-25"
  },
  {
    id: "usda-ars-image-gallery",
    name: "USDA Agricultural Research Service Image Gallery",
    domain: "ars.usda.gov",
    sourceType: "government",
    reliabilityTier: "A",
    trustedFor: ["qa_evaluation", "photo_quality_guidance", "education"],
    notTrustedFor: ["diagnosis", "lab_result", "legal_regulatory"],
    notes:
      "Rights-cleared IPM evaluation candidates only when the individual asset is marked copyright-free/public domain. Preserve URL, ARS identifier, caption, photographer, original, and review date. Independently verify the organism, visible sign, host, and evaluation label; exclude assets marked otherwise or with ambiguous rights.",
    requiresCrossCheck: true,
    preferredCrossCheckSources: ["uc-ipm", "usda-aphis", "growpath-method"],
    lastReviewedAt: "2026-08-08"
  },
  {
    id: "usda-ipm-images",
    name: "IPM Images / Bugwood via USDA Ag Data Commons",
    domain: "agdatacommons.nal.usda.gov",
    sourceType: "government",
    reliabilityTier: "A",
    trustedFor: ["qa_evaluation", "photo_quality_guidance", "education"],
    notTrustedFor: ["diagnosis", "lab_result", "legal_regulatory"],
    notes:
      "Government catalog context for public-domain pest, disease, damage, commodity, and biological-control media. Admit only assets with retained individual image page, credit, identifier, rights statement, host, visible sign, and reviewer-confirmed label; collection membership is not app-ready diagnostic ground truth.",
    requiresCrossCheck: true,
    preferredCrossCheckSources: ["uc-ipm", "usda-aphis", "growpath-method"],
    lastReviewedAt: "2026-08-08"
  },
  {
    id: "inaturalist-licensed-ipm-media",
    name: "iNaturalist licensed observation images for IPM evaluation",
    domain: "inaturalist.org",
    sourceType: "botanical_database",
    reliabilityTier: "C",
    trustedFor: ["qa_evaluation", "photo_quality_guidance"],
    notTrustedFor: ["diagnosis", "ipm", "lab_result", "legal_regulatory"],
    notes:
      "Candidate organism shape, life-stage, host, and field-context media only. Commercial intake requires the individual photo's CC0 or CC BY license; preserve attribution and license metadata. Observation licenses and community/Research Grade status are not image rights or diagnostic ground truth. Exclude NC, ND, all-rights-reserved, missing-license, and ambiguous media.",
    requiresCrossCheck: true,
    preferredCrossCheckSources: ["uc-ipm", "usda-aphis", "growpath-method"],
    lastReviewedAt: "2026-08-08"
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
    trustedFor: [
      "diagnosis",
      "ipm",
      "soil_science",
      "nutrient_chemistry",
      "grow_history",
      "education"
    ],
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
    trustedFor: ["diagnosis", "ipm", "consumer_review", "grow_history", "education"],
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
