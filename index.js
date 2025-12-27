import { registerRootComponent } from "expo";
import App from "./App";

if (typeof globalThis !== "undefined" && typeof globalThis.global === "undefined") {
  globalThis.global = globalThis;
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
import AppWithOnboarding from "./AppWithOnboarding";

registerRootComponent(AppWithOnboarding);
