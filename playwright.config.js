import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PLAYWRIGHT_WEB_PORT || "19006";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/playwright",
  fullyParallel: false,
  timeout: 180000,
  expect: {
    timeout: 60000
  },
  use: {
    baseURL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    headless: true,
    viewport: { width: 1280, height: 720 }
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: {
    command: [
      `CI=1 EXPO_PUBLIC_API_URL=${process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:5001"}`,
      "npx",
      "expo",
      "start",
      "--web",
      "--port",
      PORT
    ].join(" "),
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 240000
  }
});
