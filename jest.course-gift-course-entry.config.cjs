const base = require("./jest.config.cjs");
module.exports = {
  ...base,
  testMatch: ["<rootDir>/tests/unit/CourseGiftCourseEntry.test.tsx"],
  collectCoverage: false,
  maxWorkers: 1
};
