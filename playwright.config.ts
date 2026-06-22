import { defineConfig, devices } from "@playwright/test";

const port = process.env.PLAYWRIGHT_WEB_PORT || "8081";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${port}`;
const systemChrome = process.env.PLAYWRIGHT_USE_SYSTEM_CHROME === "1"
  ? { channel: "chrome" }
  : {};
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1";
const video = process.env.PLAYWRIGHT_DISABLE_VIDEO === "1"
  ? "off"
  : "retain-on-failure";

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 2 : 0,
  fullyParallel: true,
  reporter: [["list"], ["html"]],

  use: {
    testIdAttribute: "data-testid",
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video
  },
  webServer: skipWebServer
    ? undefined
    : {
        command: `npx expo start --web --port ${port} --clear`,
        url: `http://localhost:${port}`,
        reuseExistingServer: false,
        timeout: 180_000,
        env: {
          ...process.env,
          CI: "1",
          EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || "http://localhost:5002"
        }
      },
  projects: [
    {
      name: "chromium",
      use: {
        testIdAttribute: "data-testid",
        ...devices["Desktop Chrome"],
        ...systemChrome
      }
    }
  ]
});
