# Tissue Culture

## Purpose and access

The Tissue Culture tool is a cannabis/hemp laboratory record and decision-support workflow. It requires an owned cannabis/hemp grow at the API boundary. It is not a validated laboratory SOP, pathogen test, genetic-fidelity test, or automatic release authorization.

The workflow must keep four lanes distinct:

1. Mother bank: source-line maintenance and release evidence.
2. Production line: initiation, multiplication, rooting, transfer, and acclimation work.
3. Ordinary cold storage: reduced-growth storage with location, measured temperature, entry, retrieval, and recovery records.
4. Cryopreservation: only a separately validated freeze, storage, retrieval, and recovery process. Ordinary refrigeration is not cryopreservation.

## Required batch evidence

Every calculation requires:

- project and batch identifiers;
- workflow lane and culture stage;
- direct-inspection status;
- observation timestamp and source;
- total vessel count;
- counted contaminated, fungal-like appearance, browning, stalled, and rooted vessels.

Required fields start blank. Zero is a recorded count, not a default. Each condition count must be a whole number no greater than total vessels. Fungal-like appearance is a subset of the contaminated-vessel count. Conditions may overlap when a vessel has more than one recorded pattern.

The useful traceability packet includes genetics/source line, mother bank or source batch, parent transfer, vessel/rack/shelf, SOP version, media recipe and lot, sterilization run and control outcome, technician custody, last handling action, transfer cycle, incubation location and telemetry, and inventory location.

## Visible pattern and media limits

Record visible categories and their batch distribution. Do not identify bacteria, fungi, yeast, viruses, viroids, or another causal agent from appearance. Use an appropriate laboratory method when organism identity or pathogen status matters.

Photos may document the full batch pattern and representative normal and affected vessels. They cannot:

- supply vessel counts, dates, lots, custody, costs, or sensor measurements;
- prove hidden contents, pathogen freedom, or genetic fidelity;
- identify a microorganism;
- replace linked laboratory evidence.

A saved run may claim pixel analysis only when provider execution evidence records attached media, analyzed photo count, evidence used, quality, confidence, and limitations. Attached video is stored as evidence but is not automatically interpreted.

## Stage and protocol comparison

Use the Stage 0-4 structure as a workflow vocabulary:

- Stage 0: stock/donor selection;
- Stage 1: initiation;
- Stage 2: multiplication;
- Stage 3: rooting;
- Stage 4: acclimation.

Storage and recovery are additional recorded states. Stage names do not create universal media, hormone, temperature, light, or timing targets.

Compare protocol cohorts by genotype/source line, explant type, SOP version, media lot, transfer cycle, technician, vessel position, measured environment, contamination, survival, regrowth, acclimation, labor, and cost per surviving plant. Published protocol conditions are study- and genotype-specific context, not silent production defaults.

## Quality control and release

Keep material blocked from production or storage release when evidence is incomplete or a visible issue is unresolved. Review:

- contamination isolation and final disposition;
- direct-inspection findings;
- SOP, media lot, sterilization run, and control evidence;
- vessel traceability;
- linked pathogen/indexing status;
- genetic stability or off-type review;
- cryopreservation validation and recovery evidence when that lane is selected.

GrowPath records an evidence review. The responsible owner reviews and authorizes release; the calculator never releases material automatically.

## Outputs and follow-up

Return:

- assessment and confidence status;
- batch identity, lane, stage, timestamp, source, and counts;
- contamination, fungal-like appearance, browning, stalled, and rooting percentages;
- structured visible failure modes, counter-evidence, next checks, and limitations;
- missing traceability and release blockers;
- SOP/media/sterilization, environment, quality-control, acclimation, protocol, cost, and storage records;
- source and method IDs;
- media-analysis provenance;
- owner-timed transfer, isolation, traceability, release, storage, and recovery tasks.

Do not invent a 14-day transfer deadline. Create a dated transfer task only from an owner-recorded schedule. Immediate evidence and release reviews may be scheduled as workflow tasks, but they are not biological completion claims.

## Sources

- USDA Agricultural Research Service, _Hemp Germplasm Laboratory Tissue Culture Protocol_ (2025): official Stage 0-4 workflow, sterile handling, contamination controls, rooting, and acclimation context. `https://www.ars.usda.gov/ARSUserFiles/80600500/HDM_data/KBH_Tissue_Culture.pdf`
- Holmes et al., _Micropropagation and Cryopreservation of Cannabis sativa L. for the Preservation of Genetic Diversity_ / drug-type cannabis tissue-culture study context, Frontiers in Plant Science (2021), DOI `10.3389/fpls.2021.732344`: genotype, medium, contamination, rooting, and acclimation outcomes vary by protocol and genotype. `https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2021.732344/full`

Last reviewed: 2026-07-21.
