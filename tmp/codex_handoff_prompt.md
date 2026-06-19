You are helping implement the next GrowPathAI upgrade in this repo.

Context:
- Repo: growpath-commerical-frontend
- Current branch: main
- A first slice already exists: nutrient chemistry engine + tool screen + tool hub route.
- Recent commit: 432403c (nutrient chemistry engine + screen + route).

Primary objective:
Implement the next phase of a Nutrient Chemistry + Release Engine so the app reasons about nutrient behavior, not just NPK labels.

Core product requirements:
1) Nutrient form intelligence per ingredient:
- chemical form (nitrate, ammonium, carbonate, sulfate, phosphate, chelate, organic protein)
- release mechanism (water soluble, microbial mineralization, carbonate dissolution, chelated, etc.)
- speed classes (immediate/fast/medium/slow/very_slow)
- pH effect, EC impact, mobility
- best use, bad use, warnings
- confidence/source metadata

2) Nutrient release timing behavior:
- release adjustments by soil temperature, moisture, microbial activity, pH
- stage timing warning, especially late flower mismatch

3) Nitrogen form intelligence:
- nitrate vs ammonium vs urea vs organic N behavior and risks

4) Chelate intelligence:
- Fe_EDTA / Fe_DTPA / Fe_EDDHA pH stability handling

5) Fast-fix vs soil-building decisioning:
- intent mapping for calcium and analogous behavior for other nutrients

6) Compatibility warnings:
- calcium salts + phosphates in concentrate
- high K vs Ca/Mg antagonism warning
- high pH + lime warning
- high EC caution

7) Tool UX:
- nutrient source comparison view grouped by speed
- ingredient breakdown detail with form/speed/pH/use/not-for/warnings
- time-release timeline output bands (0-3d, 3-14d, 14-45d, 45-120d, 120+d)
- save run to log/task integration

8) Product confidence system:
- verified label, user-entered, typical estimate, manufacturer source, extension-backed estimate, lab-tested

Architecture + implementation expectations:
- Work inside existing patterns used in src/features/personal/tools and src/app/home/personal/(tabs)/tools.
- Keep changes incremental and compile-safe.
- Add strict TypeScript types for new models.
- Prefer reusable engine functions + thin UI screen wiring.
- Preserve existing style and APIs.

Scope for this Codex pass:
- Implement next concrete, shippable increment (not a giant rewrite).
- Include at least:
  a) richer ingredient schema extensions
  b) release timeline function returning grouped windows
  c) compatibility engine expansion
  d) UI additions on nutrient chemistry screen to display timeline and confidence/source
  e) save payload includes timeline and compatibility output
- Add or update tests if test scaffolding exists nearby; otherwise add small pure-function tests for new engine logic.

Output requirements:
- Make code edits directly.
- At end, provide:
  1) files changed
  2) what was implemented
  3) any assumptions
  4) any follow-up TODOs for the next phase.
