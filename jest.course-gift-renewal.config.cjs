const base = require("./jest.config.cjs");
module.exports = {
  ...base,
  testMatch: ["<rootDir>/tests/unit/CourseGiftRenewal.test.tsx"],
  collectCoverage: false,
  maxWorkers: 1
};
