const base = require("./jest.plant-id-photo-first.config.cjs");
module.exports = { ...base, testTimeout: 15000, testMatch: [
  "<rootDir>/tests/unit/PlantIdCandidateVocabulary.test.tsx",
  "<rootDir>/tests/unit/PlantIdBestMatch.test.tsx",
  "<rootDir>/tests/unit/SpeciesCropIdToolScreen.test.tsx"
], testNamePattern: [
  "Plant ID candidate vocabulary display",
  "owner identity is distinct from AI history",
  "reevaluates a legacy lighting rejection once under the detail-aware policy"
].join("|") };
