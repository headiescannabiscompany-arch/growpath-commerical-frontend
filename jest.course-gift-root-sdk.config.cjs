// Only the two new R09-04E suites. No broader discovery or previous suite rerun.
const base = require("./jest.config.cjs");
module.exports = {
  ...base,
  testMatch: [
    "<rootDir>/tests/unit/CourseGiftRootProviders.test.tsx",
    "<rootDir>/tests/unit/CourseGiftSdkEnvelope.test.ts"
  ],
  // The installed RN SDK ships ESM; transform it with the existing Expo preset.
  transformIgnorePatterns: base.transformIgnorePatterns.map((pattern) =>
    pattern.replace("(?!(jest-)?", "(?!@sentry/|@sentry-internal/|(jest-)?")
  ),
  collectCoverage: false,
  maxWorkers: 1
};
