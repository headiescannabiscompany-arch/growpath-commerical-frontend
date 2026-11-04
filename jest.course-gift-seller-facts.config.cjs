const base = require("./jest.config.cjs");
module.exports = { ...base, maxWorkers: 1, collectCoverage: false,
  setupFiles: [...base.setupFiles, "<rootDir>/tests/fixtures/courseGiftSellerDisclosureIsolation.cjs"],
  testMatch: ["<rootDir>/tests/unit/CourseGiftSellerFacts.test.tsx", "<rootDir>/tests/unit/CourseGiftSaleBinding.test.tsx"],
  testNamePattern: "creator form has no inferred|saved facts prefill|editing a reviewed contact|buyer review displays authorized|refuses malformed or unconsented|wire requires a complete creator|session binds reviewed facts|lost save requires explicit same-declaration|changed declaration cannot replace|server reply cannot substitute|recovery remains compatible with legacy hints|buyer session carries the reviewed declaration|loads creator terms, requires explicit acceptance|does not interpret an idempotent revoked save" };
