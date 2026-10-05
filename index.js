import { App } from "expo-router/build/qualified-entry.js";
import { renderRootComponent } from "expo-router/build/renderRootComponent.js";
import { initializeMarketingAnalytics } from "./src/analytics/heycatch";

initializeMarketingAnalytics();
renderRootComponent(App);
