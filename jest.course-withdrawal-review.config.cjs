const base = require("./jest.config.cjs");
module.exports = { ...base, maxWorkers: 1, collectCoverage: false,
  setupFiles: [...base.setupFiles, "<rootDir>/tests/fixtures/courseGiftSellerDisclosureIsolation.cjs"],
  testMatch: ["<rootDir>/tests/unit/CourseWithdrawalReview.test.tsx", "<rootDir>/tests/unit/PlatformAdminRoute.test.tsx"],
  testNamePattern: "R09 withdrawal rights UI|lets platform admins resolve a stored bug report|lets platform admins assign support to themselves and retain an internal case note" };
