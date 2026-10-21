module.exports = {
  ...require("./jest.config.cjs"),
  testMatch: [
    "<rootDir>/tests/unit/CreatorProfilePreview.test.ts",
    "<rootDir>/tests/unit/CreatorProfileRoute.test.tsx"
  ],
  // New preview cases plus only the three affected route/publication boundaries.
  testNamePattern: "creator preview|shows a deliberately published profile|does not follow self and renders only the public snapshot|keeps an absent/withdrawn profile private",
  maxWorkers: 1,
  collectCoverage: false
};
