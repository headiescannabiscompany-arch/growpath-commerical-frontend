module.exports = {
  ...require("./jest.config.cjs"),
  testMatch: ["<rootDir>/tests/unit/CourseGiftApprovedCopy.test.tsx"],
  collectCoverage: false,
  maxWorkers: 1
};
