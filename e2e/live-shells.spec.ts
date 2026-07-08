import { expect, test } from "@playwright/test";

type LiveUser = {
  email: string;
  password: string;
  expectedMode: "personal" | "commercial" | "facility";
};

const USERS: LiveUser[] = [
  {
    email: process.env.E2E_PERSONAL_EMAIL || "free@growpathai.com",
    password:
      process.env.E2E_PERSONAL_PASSWORD || process.env.E2E_PASSWORD || "Test1234!",
    expectedMode: "personal"
  },
  {
    email: process.env.E2E_COMMERCIAL_EMAIL || "commercial@growpathai.com",
    password:
      process.env.E2E_COMMERCIAL_PASSWORD || process.env.E2E_PASSWORD || "Test1234!",
    expectedMode: "commercial"
  },
  {
    email: process.env.E2E_FACILITY_EMAIL || "facility@growpathai.com",
    password:
      process.env.E2E_FACILITY_PASSWORD || process.env.E2E_PASSWORD || "Test1234!",
    expectedMode: "facility"
  }
];

async function login(page: any, user: LiveUser) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Email").fill(user.email);
  await page.getByPlaceholder("Password").fill(user.password);
  await page.getByText("Sign in").last().click();
  await page.waitForURL((url: URL) => !url.pathname.endsWith("/login"), {
    timeout: 30000
  });
}

test.describe("live seeded shell routing", () => {
  for (const user of USERS) {
    test(`${user.expectedMode} user routes from /api/me context`, async ({ page }) => {
      await login(page, user);

      await expect(page.getByText("Sign in")).toHaveCount(0);

      if (user.expectedMode === "personal") {
        await expect(page.getByText("Your Garden")).toBeVisible({ timeout: 30000 });
        return;
      }

      await expect(page.getByText("Your Garden")).toHaveCount(0);
      if (user.expectedMode === "facility") {
        await expect(page.getByText("Operations Live")).toBeVisible({
          timeout: 30000
        });
        return;
      }

      await expect(page).toHaveURL(/\/facilities|\/feed|\/home\/commercial/);
      await expect(page.getByText(/facility|commercial|feed/i).first()).toBeVisible();
    });
  }
});
