import { expect, test, type Page, type TestInfo } from "@playwright/test";

const PASSWORD = process.env.E2E_PASSWORD || "Test1234!";

async function login(page: Page, email: string) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(PASSWORD);
  await page.getByText("Sign in").last().click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 30000 });
}

async function inspectPages(
  page: Page,
  testInfo: TestInfo,
  pages: Array<{ path: string; heading: RegExp; key: string }>
) {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));

  for (const item of pages) {
    await test.step(item.path, async () => {
      await page.goto(item.path, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(
        new RegExp(item.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      );
      await expect(page.getByRole("heading", { name: item.heading }).first()).toBeVisible(
        {
          timeout: 30000
        }
      );
      await expect(page.getByText(/page not found|route not found/i)).toHaveCount(0);
      await expect(page.getByText(/^Loading(?:\s|\.{3})/i)).toHaveCount(0, {
        timeout: 30000
      });
      await expect(page.getByRole("progressbar")).toHaveCount(0, { timeout: 30000 });
      if (item.path === "/home/commercial") {
        await expect(page.getByText("Loading dashboard data...")).toHaveCount(0, {
          timeout: 30000
        });
      }
      if (item.path === "/home/facility/profile") {
        await expect(page.getByText("Loading profile...")).toHaveCount(0, {
          timeout: 15000
        });
        await expect(page.getByText("AI Tokens")).toBeVisible({ timeout: 15000 });
      }
      if (item.path === "/home/facility/ai-tools") {
        await expect(page.getByText("AI Tokens")).toBeVisible({ timeout: 15000 });
      }
      await page.screenshot({
        path: testInfo.outputPath(`${item.key}.png`),
        fullPage: true
      });
    });
  }

  expect(runtimeErrors, `Browser runtime errors:\n${runtimeErrors.join("\n")}`).toEqual(
    []
  );
}

test("Single Pro production page crawl", async ({ page }, testInfo) => {
  await login(page, process.env.E2E_PERSONAL_EMAIL || "single@growpathai.com");
  await inspectPages(page, testInfo, [
    { path: "/home/personal", heading: /^Home$/i, key: "personal-home" },
    { path: "/home/personal/grows", heading: /^Grows$/i, key: "personal-grows" },
    { path: "/home/personal/tasks", heading: /Task/i, key: "personal-tasks" },
    { path: "/home/personal/tools", heading: /Tools/i, key: "personal-tools" },
    { path: "/home/personal/forum", heading: /Forum|Q&A/i, key: "personal-forum" },
    { path: "/home/personal/courses", heading: /Courses/i, key: "personal-courses" },
    { path: "/home/personal/profile", heading: /Profile/i, key: "personal-profile" }
  ]);
});

test("Commercial production page crawl", async ({ page }, testInfo) => {
  await login(page, process.env.E2E_COMMERCIAL_EMAIL || "commercial@growpathai.com");
  await inspectPages(page, testInfo, [
    { path: "/home/commercial", heading: /^Dashboard$/i, key: "commercial-home" },
    {
      path: "/home/commercial/products",
      heading: /Products/i,
      key: "commercial-products"
    },
    {
      path: "/home/commercial/inventory",
      heading: /Inventory/i,
      key: "commercial-inventory"
    },
    {
      path: "/home/commercial/grows",
      heading: /Grow|Evidence/i,
      key: "commercial-grows"
    },
    { path: "/home/commercial/tasks", heading: /Tasks/i, key: "commercial-tasks" },
    { path: "/home/commercial/courses", heading: /Courses/i, key: "commercial-courses" },
    { path: "/home/commercial/lives", heading: /Live/i, key: "commercial-lives" },
    {
      path: "/home/commercial/community",
      heading: /Community|Forum/i,
      key: "commercial-community"
    },
    {
      path: "/home/commercial/storefront",
      heading: /Storefront/i,
      key: "commercial-storefront"
    },
    {
      path: "/home/commercial/analytics",
      heading: /Analytics/i,
      key: "commercial-analytics"
    },
    { path: "/home/commercial/profile", heading: /Profile/i, key: "commercial-profile" }
  ]);
});

test("Facility owner production page crawl", async ({ page }, testInfo) => {
  await login(page, process.env.E2E_FACILITY_EMAIL || "facility@growpathai.com");
  await inspectPages(page, testInfo, [
    { path: "/home/facility", heading: /^Dashboard$/i, key: "facility-dashboard" },
    { path: "/home/facility/rooms", heading: /^Rooms$/i, key: "facility-rooms" },
    { path: "/home/facility/grows", heading: /Grows/i, key: "facility-grows" },
    {
      path: "/home/facility/inventory",
      heading: /Inventory/i,
      key: "facility-inventory"
    },
    { path: "/home/facility/tasks", heading: /Tasks/i, key: "facility-tasks" },
    { path: "/home/facility/sop-runs", heading: /SOP/i, key: "facility-sops" },
    {
      path: "/home/facility/integrations",
      heading: /Integration/i,
      key: "facility-integrations"
    },
    { path: "/home/facility/team", heading: /Team/i, key: "facility-team" },
    { path: "/home/facility/ai-tools", heading: /AI/i, key: "facility-ai" },
    { path: "/home/facility/profile", heading: /Profile/i, key: "facility-profile" },
    {
      path: "/home/facility/feed",
      heading: /Facility Outreach/i,
      key: "facility-feed"
    }
  ]);
});
