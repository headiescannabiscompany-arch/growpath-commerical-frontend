module.exports = {
  rootDir: ".",
  roots: ["<rootDir>/tests/unit"],
  testEnvironment: "node",
  testMatch: [
    "<rootDir>/tests/unit/BlueskyShare.test.ts",
    "<rootDir>/tests/unit/PublicShareActions.test.ts"
  ],
  testNamePattern:
    "Bluesky bounded share repair|keeps all video share destinations on the versioned preview",
  setupFiles: ["<rootDir>/tests/fixtures/blueskyShareIsolation.cjs"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          target: "ES2022",
          module: "CommonJS",
          esModuleInterop: true,
          skipLibCheck: true,
          types: ["jest", "node"],
          paths: { "@/*": ["./src/*"] }
        }
      }
    ]
  },
  maxWorkers: 1,
  clearMocks: true,
  restoreMocks: true,
  collectCoverage: false
};
