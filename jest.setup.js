// 🔒 React Native / Expo global (required for Node/Jest)
global.__DEV__ = false;
// expo-constants is the usual first failure
jest.mock("expo-constants", () => ({
  default: {
    manifest: {},
    expoConfig: {},
    deviceName: "jest",
    platform: { ios: null, android: null, web: true }
  }
}));

// If other expo modules pop up, add them here explicitly
jest.mock("expo-file-system", () => ({}));
jest.mock("expo-secure-store", () => ({}));
jest.mock("expo-asset", () => ({}));

// React Native gesture handler sometimes leaks in
jest.mock("react-native-gesture-handler", () => ({}));
