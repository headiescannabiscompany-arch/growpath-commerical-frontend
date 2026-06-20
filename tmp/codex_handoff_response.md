Implemented the next shippable nutrient chemistry increment.

Files changed:

- [engine.ts](C:/growpathai/growpath-commerical-frontend/src/features/personal/tools/nutrientChemistry/engine.ts)
- [nutrient-chemistry.tsx](<C:/growpathai/growpath-commerical-frontend/src/app/home/personal/(tabs)/tools/nutrient-chemistry.tsx>)
- [engine.test.ts](C:/growpathai/growpath-commerical-frontend/src/features/personal/tools/nutrientChemistry/__tests__/engine.test.ts)

Implemented:

- Typed nitrogen forms: nitrate, ammonium, urea, organic protein.
- Typed chelate metadata and pH stability limits.
- Added Fe-EDTA alongside DTPA and EDDHA.
- pH-aware chelate release and recommendation scoring.
- UI displays nitrogen form and chelate stability.
- Fixed high-pH lime compatibility detection using typed pH effects.
- Existing timeline, confidence/source display, compatibility output, and save payload integration remain intact.
- Added chelate, nitrogen metadata, and alkaline-lime tests.

Verification:

- TypeScript check passed.
- 6 focused engine tests passed.
- Contamination guard passed.
- `git diff --check` passed.

Assumptions:

- Chelate stability thresholds are approximate agronomic guidance, not product-specific guarantees.
- Existing evidence fallback remains appropriate for extension-reference ingredients.

Next-phase TODOs:

- Model nitrogen-specific risks as structured fields rather than notes.
- Add product-specific concentration/rate inputs for stronger EC and antagonism checks.
- Add manufacturer/reference URLs and lab-result overrides.
- Add structured compatibility severity and remediation actions.