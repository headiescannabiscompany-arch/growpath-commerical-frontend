const base = require("./jest.config.cjs");
module.exports = {
  ...base,
  maxWorkers: 1,
  collectCoverage: false,
  testMatch: ["<rootDir>/tests/unit/CourseGiftProductionWiring.test.tsx"],
  testEnvironmentOptions: { url: "https://growpathai.com/courses" }
};
