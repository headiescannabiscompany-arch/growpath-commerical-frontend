import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 2 : 0,
  fullyParallel: true,
  reporter: [["list"], ["html"]],

  use: {
    testIdAttribute: "data-testid",
    baseURL: "http://localhost:8081",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: {
    command: "npx expo start --web --port 8081 --clear",
    url: "http://localhost:8081",
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || "http://localhost:5002"
    }
  },
  projects: [
    {
      name: "chromium",
      use: {
    testIdAttribute: "data-testid", ...devices["Desktop Chrome"] }
    }
  ]
});
