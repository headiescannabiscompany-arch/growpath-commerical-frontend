module.exports = {
  preset: "react-native",
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest"
  },
  testEnvironment: "node",
  moduleFileExtensions: ["js", "jsx", "json", "ts", "tsx"],
  // Transform ALL node_modules except those explicitly known to break
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|@testing-library/react-native|@react-navigation|expo|expo-.*|@expo|@unimodules|@react-native-community|@react-native-picker|@react-native-masked-view|@react-native-async-storage|@react-native-segmented-control|@react-native-clipboard|@react-native-polyfill|@react-native-firebase|@react-native-svg|@react-native/assets|@react-native/assets-registry|@react-native/assets-source|@react-native/assets-source-registry|@react-native/assets-source|@react-native/assets-source-registry|@react-native/assets|@react-native/assets-registry|@react-native/assets-source|@react-native/assets-source-registry|@react-native/assets-source|@react-native/assets-source-registry)/)"
  ],
  setupFilesAfterEnv: [
    "@testing-library/jest-native/extend-expect",
    "<rootDir>/jest.setup.js"
  ],
  testPathIgnorePatterns: [
    "/tests/playwright/",
    "/tests/growLogs.spec.js$",
    "/tests/check-sensitive-copy.test.js$"
  ]
};
