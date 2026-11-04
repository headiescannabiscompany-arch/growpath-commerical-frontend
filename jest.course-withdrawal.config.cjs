const base = require("./jest.config.cjs");
module.exports = { ...base, maxWorkers: 1, collectCoverage: false,
  setupFiles: [...base.setupFiles, "<rootDir>/tests/fixtures/courseGiftSellerDisclosureIsolation.cjs"],
  testMatch: ["<rootDir>/tests/unit/CourseWithdrawalNotice.test.tsx"] };
