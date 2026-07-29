/** @type {import("jest").Config} */
module.exports = {
  rootDir: ".",
  testEnvironment: "node",
  // `npm run test:backend` scopes to dependency-free backend units.
  // `npm run test:backend:all` also loads route tests that require supertest.
  testMatch: ["<rootDir>/backend/**/*.test.js"],
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/tmp/"],
  modulePathIgnorePatterns: [
    "<rootDir>/backend-media-storage/",
    "<rootDir>/tmp/"
  ],
  clearMocks: true,
  resetMocks: false,
  restoreMocks: false
};
