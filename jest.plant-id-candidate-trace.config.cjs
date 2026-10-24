const base = require("./jest.plant-id-photo-first.config.cjs");
module.exports = { ...base, testTimeout: 15000, testMatch: [
  "<rootDir>/tests/unit/PlantIdBestMatch.test.tsx",
  "<rootDir>/tests/unit/SpeciesCropIdToolScreen.test.tsx"
], testNamePattern: [
  "Plant ID candidate trace display",
  "insufficient evidence and historical candidates",
  "a changed final list cannot inherit",
  "limited and unusable results cannot leak",
  "owner identity is distinct from AI history",
  "shows a leading named-type card",
  "close alternatives show both",
  "reevaluates a legacy lighting rejection once under the detail-aware policy"
].join("|") };
