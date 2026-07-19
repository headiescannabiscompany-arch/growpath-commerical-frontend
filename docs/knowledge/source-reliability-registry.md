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

Every runtime source entry must declare `trustedFor`, `notTrustedFor`, whether cross-checking is required, and `lastReviewedAt`. User observations are primary evidence of what the user observed, not automatic proof of cause.
