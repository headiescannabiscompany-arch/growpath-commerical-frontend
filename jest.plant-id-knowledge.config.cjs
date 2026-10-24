const base = require("./jest.config.cjs");
module.exports = {
  ...base, cache: false, maxWorkers: 1, collectCoverage: false, testTimeout: 15000,
  testMatch: ["<rootDir>/tests/unit/PlantIdKnowledge.test.tsx", "<rootDir>/tests/unit/SpeciesCropIdToolScreen.test.tsx"],
  setupFilesAfterEnv: [...base.setupFilesAfterEnv, "<rootDir>/tests/fixtures/plantIdPhotoFirstIsolation.cjs"],
  testNamePattern: [
    "Plant ID knowledge correction",
    "keeps an illuminated nighttime cannabis view as a usable unconfirmable candidate",
    "reevaluates a legacy lighting rejection once under the detail-aware policy",
    "honors the server confirmation block and shows its reason",
    "lets a user Rose correction override a conflicting medium AI Cabbage candidate",
    "prevents an unchanged weak result from being upgraded to a named medium-confidence run",
    "shows a crop-level candidate when artificial lighting limits exact certainty but preserves diagnostic structure"
  ].join("|")
};
