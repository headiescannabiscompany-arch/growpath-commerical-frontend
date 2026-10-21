const base = require("./jest.config.cjs");

module.exports = {
  ...base,
  rootDir: __dirname,
  roots: ["<rootDir>/tests/unit"],
  testMatch: ["<rootDir>/tests/unit/CourseGiftStagingSupportEntry.test.tsx"],
  collectCoverage: false,
  maxWorkers: 1
};
