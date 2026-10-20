module.exports = {
  ...require("./jest.config.cjs"),
  testMatch: [
    "<rootDir>/tests/unit/CourseCheckoutSupportClient.test.ts",
    "<rootDir>/tests/unit/CourseCheckoutSupportPanel.test.tsx"
  ],
  testNamePattern:
    "^(R09-06H |R09-06D dormant private support client uses exact .* POST and real existing proof wrapper$|R09-06E dormant private support panel uncertainty keeps exact request and requires a new deliberate retry acknowledgment$)",
  collectCoverage: false
};
