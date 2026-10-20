module.exports = {
  ...require("./jest.config.cjs"),
  testMatch: [
    "<rootDir>/tests/unit/CourseCheckoutSupportClient.test.ts",
    "<rootDir>/tests/unit/CourseCheckoutSupportPanel.test.tsx"
  ],
  testNamePattern:
    "^(R09-06AN |R09-06D dormant private support client uses exact .* POST and real existing proof wrapper$)",
  collectCoverage: false
};
