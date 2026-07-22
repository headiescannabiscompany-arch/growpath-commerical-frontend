# Source Reliability Registry

Reliability is use-case specific. A breeder can be authoritative for its own parentage claim and still be unsuitable evidence for yield, medical effects, or disease resistance.

## Tiers

- **A — decision source:** peer-reviewed research, university extension, government agriculture/regulation, credible batch-specific lab reports, official product/safety labels.
- **B — context-limited official source:** manufacturers, breeders, product sheets, equipment manuals, sensor/API documentation. Use for the publisher's claims and specifications, not unbiased performance proof.
- **C — anecdotal/lead source:** forums, Reddit, YouTube, Discord, consumer cultivar databases, dispensary menus and reviews. Use to discover patterns or evidence leads; cross-check before decisions.
- **D — marketing/unsupported:** SEO/affiliate pages, unattributed seed-bank copy, unsupported health claims, copied or AI-generated articles. Do not use for decision logic without independent verification.

## Initial authorities

- UC IPM, USDA/APHIS, Cornell, Penn State, NC State, Maryland, Oregon State, Colorado State, Clemson and Virginia Tech extension: Tier A for IPM, soil, fertility, water and horticultural principles.
- Credible COAs: Tier A only for the named lab, method, sample, batch and date. Never generalize one result to a cultivar or future batch.
- Official fertilizer/product labels: Tier A for guaranteed analysis and legal/safety label content; manufacturer pages are Tier B for instructions/specifications.
- Breeder sites: Tier B for official name, claimed parentage, seed type and breeder flowering estimate; not proof of yield, effects, resistance or future phenotype.
- Leafly, Weedmaps and menus: Tier C for market listings, consumer language and COA leads; not agronomy or cultivar identity.
- Forums/social video: Tier C anecdote. Never sole support for diagnosis, pesticide use, legal guidance or genetics provenance.
- NC State Extension Gardener Handbook, propagation chapter: Tier A for general cutting-propagation principles including high-humidity water-loss control and clean, low-fertility, well-drained, moisture-retentive media. It cannot prove hidden roots or set a cannabis-specific completion day.
- `HORT.20250043`, _Light, Temperature, and Relative Humidity Influence the Adventitious Rooting of Cannabis Stem Cuttings_: Tier A peer-reviewed propagation context from two Korean hemp cultivars. Treat tested environment ranges as cultivar- and study-specific context because cultivar responses differed and combined-variable effects were not tested.
- USDA ARS, _Hemp Germplasm Laboratory Tissue Culture Protocol_ (2025): Tier A official hemp germplasm laboratory context for the Stage 0-4 workflow, sterile handling, contamination control, rooting, and acclimation. It is not a universal production recipe, pathogen test, or individual-batch release record.
- Holmes et al. (2021), DOI `10.3389/fpls.2021.732344`: Tier A primary drug-type cannabis tissue-culture research for genotype- and protocol-dependent media response, contamination, rooting, acclimation, and recovery context. Cross-check with the USDA ARS workflow and the owner's measured batch records; do not convert study conditions into silent defaults.
- `PMC9404914`, _Postharvest Operations of Cannabis and Their Effect on Cannabinoid Content_: Tier A peer-reviewed review for post-harvest process factors and the fact that drying time varies by method; it does not establish one universal completion day.
- `PMID 6643`, _The stability of cannabis and its preparations on storage_: Tier A peer-reviewed evidence that light exposure degrades cannabinoids and that cannabis material should be protected from light; use as quality-preservation evidence, not a mold or safety determination.
- Owner observation recorded 2026-07-21: Tier B user/process evidence for planning a controlled dry around 10-14 days, treating a hot, fast, low-humidity 5-7 day endpoint as a possible quality concern, and recognizing that longer than 14 days can occur but is not recommended as routine. Cross-check against measurements and post-harvest research; never convert a range into automatic completion.
- Google YouTube Embedded Players / API documentation, reviewed 2026-07-22: Tier B provider documentation for supported player URL behavior, embed constraints, and provider-side data sharing. It does not prove that an individual video is available, embeddable, licensed, captioned, or appropriate for a GrowPath course.
- Vimeo video privacy and oEmbed documentation, reviewed 2026-07-22: Tier B provider documentation for privacy modes, domain restrictions, and preservation of an unlisted video's privacy hash. It does not prove an individual video's current settings, availability, rights, or accessibility.

Every runtime source entry must declare `trustedFor`, `notTrustedFor`, whether cross-checking is required, and `lastReviewedAt`. User observations are primary evidence of what the user observed, not automatic proof of cause.
