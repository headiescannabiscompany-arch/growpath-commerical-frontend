# Soil and Nutrient Method

Soil is where water, air, biology, carbon and nutrient chemistry interact. Model base/compost/aeration, water holding/drainage, CEC/buffering, biology, carbon/nitrogen, nutrient forms, label and elemental analysis, release timing, pH/EC effects, K/Ca/Mg and phosphorus/micronutrient interactions, water quality and compost uncertainty.

Presets: 3-3-3 starter; 3-1-1 veg; 2-6-4 flower; 0.5-3-3 ripen only in the last week if needed. A 3-1-1 may combine a 1-1-1 slow base with two faster nitrogen units. Always show label ratio, elemental conversion, fast/medium/slow contribution, release timeline and uncertainty.

Peat/perlite, coco, 1:1:1 Coots-style, living soil and no-till require different irrigation assumptions. Official labels support guaranteed analysis/use rates, not superiority or long-term effectiveness.

## Canonical mix builders

GrowPathAI exposes two primary mix workflows:

- **Nutrient Mix Builder** is the canonical workflow for soluble feeds, dry nutrient blends and nutrient-composition planning. It uses verified guaranteed analysis, standard label N-P2O5-K2O interpretation, elemental P/K conversion, measured or disclosed density, batch and water context, nutrient form and release timing.
- **Soil Mix Builder** is the canonical workflow for base media, compost/castings, aeration, biochar, minerals and amendments. It evaluates physical structure, water and air behavior, buffering/CEC context, biology, nutrient forms, release timing and rest/cook planning.

Personal Tools presents these through one **Soil & Nutrient Mix Builders** entry. The chooser asks what the user is building, then opens exactly one of the two canonical builders. Products & Label Library is supporting input data, not a third builder. Nutrient chemistry, source comparison, dry-amendment and topdress calculations remain supporting workflows or deeper steps; they must not be presented as competing primary recipe builders.

Topdress planning is task-owned: users start it from Personal Tasks or a grow's Tasks workspace because its primary outputs are scheduled application, water-in, response and recheck tasks. Small pH/EC and VPD calculations remain available to AI, saved results and legacy deep links, but are not primary user-facing AI Tool cards. The Soil & Nutrient Batch Planner is Commercial-only because its purpose is production costing, bag counts, pull sheets, labor, packaging, inventory and margin.

“Science-backed” means that the calculation model, inputs, evidence quality and uncertainty are visible. It is not an effectiveness or superiority claim. Verified labels, manufacturer documents, calibrated measurements, water analysis, representative soil/substrate or compost laboratory tests and recorded crop response take precedence over presets and assumptions. Never invent missing analysis, density, compatibility, uptake or response data.
