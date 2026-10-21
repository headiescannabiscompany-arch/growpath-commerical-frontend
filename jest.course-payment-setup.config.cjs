const base = require("./jest.config.cjs");
module.exports = {
  ...base,
  cacheDirectory: "<rootDir>/.cache/course-payment-setup",
  setupFiles: [...base.setupFiles, "<rootDir>/tests/fixtures/courseGiftSellerDisclosureIsolation.cjs"],
  collectCoverage: false,
  maxWorkers: 1,
  testMatch: ["<rootDir>/tests/unit/StripeCoursePaymentSetup.test.tsx", "<rootDir>/tests/unit/StripeConnectApi.test.ts", "<rootDir>/tests/unit/StripeConnectPayoutCard.test.tsx"],
  testNamePattern: "course-payment|opens Stripe payout management only|keeps a failed initial read unknown|withholds readiness while a fresh verification|starts onboarding without sending browser"
};
