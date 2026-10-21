const base = require("./jest.config.cjs");
const normalRoot = (name, origin) => ({
  ...base,
  displayName: name,
  rootDir: __dirname,
  roots: ["<rootDir>/tests/unit"],
  testMatch: ["<rootDir>/tests/unit/CourseGiftNormalStagingRoot.test.tsx"],
  testEnvironmentOptions: { url: `${origin}/courses` }
});
module.exports = {
  projects: [
    normalRoot("selected-staging-root", "https://growpath-web-staging.onrender.com"),
    normalRoot("excluded-production-root", "https://growpathai.com"),
    {
      ...base,
      displayName: "affected-root-source-assertion",
      rootDir: __dirname,
      roots: ["<rootDir>/tests/unit"],
      testMatch: ["<rootDir>/tests/unit/CourseGiftStagingWebRoot.test.tsx"],
      testEnvironmentOptions: {
        url: "https://growpath-web-staging.onrender.com/courses"
      }
    }
  ],
  testNamePattern:
    "R09 (selected normal root|production normal root)|standalone public boundary stays inert; candidate root selects only the pinned staging wrapper",
  collectCoverage: false,
  maxWorkers: 1
};
