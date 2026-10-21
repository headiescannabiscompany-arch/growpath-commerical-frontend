const base = require("./jest.config.cjs");
module.exports = { ...base,
  testMatch: ["<rootDir>/tests/unit/CourseGiftProductionOffRoot.test.tsx"],
  testEnvironmentOptions: { url: "https://growpathai.com/courses" },
  collectCoverage: false,
  maxWorkers: 1
};
