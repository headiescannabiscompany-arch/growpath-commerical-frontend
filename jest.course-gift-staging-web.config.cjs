const base = require("./jest.config.cjs");
module.exports = {
  ...base,
  testMatch: [
    "<rootDir>/tests/unit/CourseGiftStagingWebContext.test.ts",
    "<rootDir>/tests/unit/CourseGiftStagingWebRoot.test.tsx",
    "<rootDir>/tests/unit/CourseGiftHttp.test.ts",
    "<rootDir>/tests/unit/CourseGiftCourseEntry.test.tsx"
  ],
  testEnvironmentOptions: { url: "https://growpath-web-staging.onrender.com/courses" },
  testNamePattern:
    "R09 staging web (guard|root)|construction and disabled public/native entry|06U actual shared page is inert under shipped/default root",
  collectCoverage: false,
  maxWorkers: 1
};
