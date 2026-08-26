const path = require("node:path");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function absoluteDirectoryPattern(...segments) {
  const normalized = path.resolve(__dirname, ...segments).replace(/\\/g, "/");
  return `^${escapeRegex(normalized).replace(/\//g, "[/\\\\]")}[/\\\\]`;
}

/** @type {import("jest").Config} */
module.exports = {
  preset: "jest-expo",
  rootDir: ".",
  // Only the canonical frontend source and test trees belong to this suite.
  // Local Codex/worktree checkouts may sit beside them during development;
  // excluding those roots prevents duplicate mocks and accidental retesting of
  // stale copies of the application.
  roots: ["<rootDir>/src", "<rootDir>/tests"],

  // IMPORTANT:
  // Do NOT use jsdom globally for React Native / Expo.
  // If a specific test needs DOM, add: /** @jest-environment jsdom */ at the top of that test file.

  testMatch: ["**/__tests__/**/*.(test|spec).[jt]s?(x)", "**/*.(test|spec).[jt]s?(x)"],

  // Keep Jest focused on unit/QA tests.
  // Playwright tests must be run via: npx playwright test
  testPathIgnorePatterns: [
    absoluteDirectoryPattern("node_modules"),
    absoluteDirectoryPattern("tests", "core"),
    absoluteDirectoryPattern("tests", "playwright"),
    absoluteDirectoryPattern("e2e"),
    absoluteDirectoryPattern("backend"),
    absoluteDirectoryPattern("backend-media-storage"),
    absoluteDirectoryPattern(".artifacts"),
    absoluteDirectoryPattern(".tools"),
    absoluteDirectoryPattern("tmp"),
    `^${escapeRegex(
      path.resolve(__dirname, "tests", "growLogs.spec.js").replace(/\\/g, "/")
    ).replace(/\//g, "[/\\\\]")}$`
  ],

  // Embedded backend worktrees and temporary checkouts have their own Jest
  // configs and mocks. Exclude them from the frontend haste map as well as
  // frontend test discovery.
  modulePathIgnorePatterns: [
    absoluteDirectoryPattern("backend-media-storage"),
    absoluteDirectoryPattern(".artifacts"),
    absoluteDirectoryPattern(".tools"),
    absoluteDirectoryPattern("tmp")
  ],

  setupFiles: ["<rootDir>/node_modules/react-native-gesture-handler/jestSetup.js"],

  setupFilesAfterEnv: [
    "<rootDir>/tests/jest.setup.cjs",
    "<rootDir>/tests/jest.teardown.js"
  ],

  transformIgnorePatterns: [
    "node_modules/(?!(jest-)?react-native|@react-native|react-native-|@react-navigation|expo(nent)?|@expo(nent)?/.*|expo-router|@unimodules|unimodules|sentry-expo|native-base|@tanstack|@react-native-async-storage|react-native-svg)/"
  ],

  moduleNameMapper: {
    "^expo/src/winter$": "<rootDir>/tests/__mocks__/expo-winter.js",
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(png|jpg|jpeg|gif|webp|svg)$": "<rootDir>/tests/__mocks__/fileMock.js",
    "\\.(css|less|scss)$": "<rootDir>/tests/__mocks__/styleMock.js"
  },

  moduleFileExtensions: ["js", "jsx", "ts", "tsx", "json"],

  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};
