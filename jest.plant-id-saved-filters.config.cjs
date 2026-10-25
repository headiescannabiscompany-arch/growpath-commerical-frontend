const base = require("./jest.plant-id-photo-first.config.cjs");
module.exports = { ...base, testTimeout: 15000, testMatch: [
  "<rootDir>/tests/unit/PlantIdSavedFilters.test.tsx",
  "<rootDir>/tests/unit/PlantIdBestMatch.test.tsx",
  "<rootDir>/tests/unit/SpeciesCropIdToolScreen.test.tsx"
], testNamePattern: [
  "Plant ID saved-response display repair",
  "reevaluates a legacy lighting rejection once under the detail-aware policy",
  "prevents an unchanged weak result from being upgraded to a named medium-confidence run",
  "limited and unusable results cannot leak named suggestions through stale fields",
  "owner identity is distinct from AI history"
].join("|") };
