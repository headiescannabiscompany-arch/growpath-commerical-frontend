const base = require("./jest.config.cjs");
module.exports = {
  ...base, cache: false, maxWorkers: 1, collectCoverage: false, testTimeout: 20000,
  cacheDirectory: "<rootDir>/.cache/plant-id-candidate-summary-20261027",
  setupFiles: ["<rootDir>/tests/fixtures/plantIdPhotoFirstIsolation.cjs", ...base.setupFiles],
  setupFilesAfterEnv: [...base.setupFilesAfterEnv, "<rootDir>/tests/fixtures/plantIdPhotoFirstIsolation.cjs"],
  testMatch: ["<rootDir>/tests/unit/PlantIdCandidateSummary.test.tsx", "<rootDir>/tests/unit/SpeciesCropIdToolScreen.test.tsx"],
  testNamePattern: "Plant ID candidate-summary saved display|reevaluates a legacy lighting rejection once under the detail-aware policy"
};
