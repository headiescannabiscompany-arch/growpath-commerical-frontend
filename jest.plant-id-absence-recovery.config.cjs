const base = require("./jest.plant-id-photo-first.config.cjs");
module.exports = { ...base, testTimeout: 15000, testMatch: [
  "<rootDir>/tests/unit/SpeciesCropIdToolScreen.test.tsx",
  "<rootDir>/tests/unit/PlantIdBestMatch.test.tsx"
], testNamePattern: [
  "Plant ID absence recovery",
  "withholds a crop name and forces low confidence when the submitted views are limited",
  "distinguishes an unavailable image review from evidence that needs a retake",
  "prevents an unchanged weak result from being upgraded to a named medium-confidence run",
  "reevaluates a legacy lighting rejection once under the detail-aware policy",
  "limited and unusable results cannot leak named suggestions through stale fields",
  "owner identity is distinct from AI history"
].join("|") };
