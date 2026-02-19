/** @type {import("jest").Config} */
module.exports = {
  preset: "jest-expo",
  rootDir: ".",

  // IMPORTANT:
  // Do NOT use jsdom globally for React Native / Expo.
  // If a specific test needs DOM, add: /** @jest-environment jsdom */ at the top of that test file.

  testMatch: [
    "<rootDir>/**/__tests__/**/*.(test|spec).[jt]s?(x)",
    "<rootDir>/**/*.(test|spec).[jt]s?(x)"
  ],

  // Keep Jest focused on unit/QA tests.
  // Playwright tests must be run via: npx playwright test
  testPathIgnorePatterns: [
    "/node_modules/",
    "<rootDir>/tests/core/",
    "<rootDir>/tests/playwright/",
    "<rootDir>/e2e/",
    "<rootDir>/backend/",
    "<rootDir>/tests/growLogs.spec.js"
  ],

  setupFiles: [
    "<rootDir>/node_modules/react-native-gesture-handler/jestSetup.js"
  ],

  setupFilesAfterEnv: [
    "<rootDir>/tests/jest.setup.cjs"
  ],

  transformIgnorePatterns: [
    "node_modules/(?!(jest-)?react-native|@react-native|react-native-|@react-navigation|expo(nent)?|@expo(nent)?/.*|expo-router|@unimodules|unimodules|sentry-expo|native-base|@tanstack|@react-native-async-storage|react-native-svg)/"
  ],

  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(png|jpg|jpeg|gif|webp|svg)$": "<rootDir>/tests/__mocks__/fileMock.js",
    "\\.(css|less|scss)$": "<rootDir>/tests/__mocks__/styleMock.js"
  },

  moduleFileExtensions: ["js", "jsx", "ts", "tsx", "json"],

  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};