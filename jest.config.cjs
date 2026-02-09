module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  transform: {
    "^.+\\.(ts|tsx|js)$": "ts-jest"
  },
  globals: {
    "ts-jest": {
      isolatedModules: true,
      useESM: false
    }
  },
  // 🔒 Alias resolution
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  // 🔒 IMPORTANT: do NOT ignore src JS files
  transformIgnorePatterns: ["/node_modules/"],
  // 🔒 Expo / RN mocks + globals
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"]
};
