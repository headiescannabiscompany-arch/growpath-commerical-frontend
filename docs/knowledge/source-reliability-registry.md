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
- `PMC9404914`, _Postharvest Operations of Cannabis and Their Effect on Cannabinoid Content_: Tier A peer-reviewed review for post-harvest process factors and the fact that drying time varies by method; it does not establish one universal completion day.
- `PMID 6643`, _The stability of cannabis and its preparations on storage_: Tier A peer-reviewed evidence that light exposure degrades cannabinoids and that cannabis material should be protected from light; use as quality-preservation evidence, not a mold or safety determination.
- Owner observation recorded 2026-07-21: Tier B user/process evidence for planning a controlled dry around 10-14 days, treating a hot, fast, low-humidity 5-7 day endpoint as a possible quality concern, and recognizing that longer than 14 days can occur but is not recommended as routine. Cross-check against measurements and post-harvest research; never convert a range into automatic completion.

Every runtime source entry must declare `trustedFor`, `notTrustedFor`, whether cross-checking is required, and `lastReviewedAt`. User observations are primary evidence of what the user observed, not automatic proof of cause.
