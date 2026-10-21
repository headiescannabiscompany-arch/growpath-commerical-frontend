const base = require("./jest.config.cjs");
module.exports = {
  ...base,
  cacheDirectory: "<rootDir>/.cache/course-gift-seller-disclosure",
  setupFiles: [
    ...base.setupFiles,
    "<rootDir>/tests/fixtures/courseGiftSellerDisclosureIsolation.cjs"
  ],
  collectCoverage: false,
  maxWorkers: 1,
  testMatch: [
    "<rootDir>/tests/unit/CourseGiftSellerDisclosure.test.tsx",
    "<rootDir>/tests/unit/CourseGiftSaleBinding.test.tsx",
    "<rootDir>/tests/unit/CourseGiftApprovedCopy.test.tsx"
  ],
  testNamePattern:
    "seller disclosure|approved buyer copy covers other features|customer rights clarification preserves saved terms"
};
