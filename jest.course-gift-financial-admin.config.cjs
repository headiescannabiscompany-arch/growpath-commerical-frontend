const base = require("./jest.course-gift-support-screen.config.cjs");
module.exports = { ...base, maxWorkers: 1, collectCoverage: false,
  setupFiles: [...base.setupFiles, "<rootDir>/tests/fixtures/courseGiftSellerDisclosureIsolation.cjs"],
  cacheDirectory: "<rootDir>/.cache/r09-financial-admin-20261106",
  testMatch: ["<rootDir>/tests/unit/CourseGiftFinancialClient.test.ts", "<rootDir>/tests/unit/CourseGiftFinancialPanel.test.tsx",
    "<rootDir>/tests/unit/CourseCheckoutSupportClient.test.ts"],
  testNamePattern: "^R09 financial (client|panel) |^R09-06D dormant private support client (requires fresh existing step-up before any request|freezes the exact original body and reason across uncertain explicit retries)$" };
