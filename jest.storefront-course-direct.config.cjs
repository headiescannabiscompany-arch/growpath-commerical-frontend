module.exports = {
  ...require("./jest.config.cjs"),
  testMatch: ["<rootDir>/tests/unit/StorefrontCourseDirect.test.tsx"],
  testNamePattern: "^R09-04V direct course landing ",
  collectCoverage: false
};
