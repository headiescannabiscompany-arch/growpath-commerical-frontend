/**
 * Jest setup for Expo / React Native
 */

// Some RN versions don't ship this module path anymore.
// Use a VIRTUAL mock so Jest never tries to resolve it on disk.
jest.mock(
  "react-native/Libraries/Animated/NativeAnimatedHelper",
  () => ({}),
  { virtual: true }
);

// AsyncStorage: required for any code importing tokenStore.ts
jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// SecureStore often used in Expo auth flows
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {})
}));

// Safe-area-context mock (common in RN tests)
jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  return {
    SafeAreaProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    SafeAreaConsumer: ({ children }) => children({ top: 0, right: 0, bottom: 0, left: 0 }),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 })
  };
});

// Gesture handler mock (prevents a bunch of RN test crashes)
try {
  require("react-native-gesture-handler/jestSetup");
} catch (e) {}

// Reanimated mock (only if installed)
try {
  jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));
} catch (e) {}
