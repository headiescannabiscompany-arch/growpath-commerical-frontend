Implemented the next nutrient chemistry increment.

1. Files changed

- [engine.ts](C:\growpathai\growpath-commerical-frontend\src\features\personal\tools\nutrientChemistry\engine.ts)
- [nutrient-chemistry.tsx](C:\growpathai\growpath-commerical-frontend\src\app\home\personal\(tabs)\tools\nutrient-chemistry.tsx)
- [engine.test.ts](C:\growpathai\growpath-commerical-frontend\src\features\personal\tools\nutrientChemistry\__tests__\engine.test.ts)

2. Implemented

- Strict evidence classifications covering labels, estimates, manufacturers, extension sources, user data, and labs.
- Environment-adjusted timeline bands: 0–3d, 3–14d, 14–45d, 45–120d, and 120+d.
- Timeline supports overlapping release ranges.
- Expanded compatibility warnings for:
  - Calcium/phosphate concentrate precipitation.
  - High K versus Ca/Mg.
  - Multiple high-EC inputs.
  - High-EC concentrates.
- UI timeline and confidence/source display.
- Compatibility now falls back to the active recommendation when nothing is explicitly compared.
- Saved runs now include timeline and compatibility results.

3. Assumptions

- Existing source types are normalized into the new evidence classifications.
- Timeline bands represent estimated availability ranges, not application guarantees.
- Existing elemental percentages are used as relative compatibility signals.

4. Follow-up TODOs

- Add explicit citations/reference identifiers to every library ingredient.
- Add potassium-rich ingredients for broader antagonism coverage.
- Model nitrogen-form-specific loss/toxicity risks.
- Add explicit EDTA/DTPA/EDDHA pH stability ranges.
- Add task creation alongside journal saving.

Verification passed:

- 3 focused tests.
- TypeScript compilation.
- Delivery corruption, placeholder, and export scans.
- `git diff --check`.

The unrelated untracked `tmp/codex_handoff_prompt.md` was left untouched.