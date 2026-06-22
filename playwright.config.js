import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PLAYWRIGHT_WEB_PORT || "19009";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${PORT}`;
const systemChrome = process.env.PLAYWRIGHT_USE_SYSTEM_CHROME === "1"
  ? { channel: "chrome" }
  : {};
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1";
const video = process.env.PLAYWRIGHT_DISABLE_VIDEO === "1"
  ? "off"
  : "retain-on-failure";

export default defineConfig({
  testDir: "./tests/playwright",
  fullyParallel: false,
  workers: 1,
  timeout: 180000,
  expect: {
    timeout: 60000
  },
  use: {
    baseURL,
    trace: "retain-on-failure",
    video,
    screenshot: "only-on-failure",
    headless: true,
    viewport: { width: 1280, height: 720 }
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], ...systemChrome }
    }
  ],
  webServer: skipWebServer
    ? undefined
    : {
        command: `npx expo start --web --port ${PORT}`,
        url: `http://localhost:${PORT}`,
        env: { CI: "1", EXPO_PUBLIC_E2E: "1" },
        reuseExistingServer: !process.env.CI,
        stdout: "pipe",
        stderr: "pipe",
        timeout: 240000
      }
});
