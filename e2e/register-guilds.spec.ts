import { expect, test } from "@playwright/test";

const GUILDS = [
  {
    _id: "guild-cannabis",
    name: "Cannabis Facility Operators",
    description: "Licensed cultivation compliance and facility operations",
    memberCount: 42
  },
  {
    _id: "guild-fruit",
    name: "Fruit Tree Gardeners",
    description: "Orchards, bushes, grafting, and seasonal pruning",
    memberCount: 19
  },
  {
    _id: "guild-herbs",
    name: "Herb Gardeners",
    description: "Kitchen herbs, containers, and culinary gardens",
    memberCount: 12
  }
];

async function installRegisterMocks(page: any, seenPayloads: any[]) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem("seenOnboardingCarousel", "true");
    window.localStorage.setItem("seenAppIntro", "true");
    window.global = window;
  });

  const fulfillJson = (route: any, body: any, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body)
    });

  await page.route("**/api/**", async (route: any) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (method === "POST" && url.pathname === "/api/auth/signup") {
      const payload = request.postDataJSON();
      seenPayloads.push(payload);
      return fulfillJson(route, {
        token: `signup-token-${payload.plan}`,
        user: {
          id: `user-${payload.plan}`,
          email: payload.email,
          displayName: payload.displayName,
          plan: payload.plan
        }
      });
    }

    if (
      method === "GET" &&
      (url.pathname === "/api/me" || url.pathname === "/api/auth/me")
    ) {
      const latest = seenPayloads[seenPayloads.length - 1] || {
        plan: "free",
        mode: "personal"
      };
      return fulfillJson(route, {
        user: {
          id: `user-${latest.plan}`,
          email: latest.email,
          displayName: latest.displayName,
          plan: latest.plan
        },
        ctx: {
          mode: latest.mode,
          plan: latest.plan,
          subscriptionStatus: latest.plan === "free" ? "free" : "inactive",
          capabilities: {},
          limits: {}
        }
      });
    }

    if (method === "GET" && url.pathname === "/api/guilds") {
      return fulfillJson(route, GUILDS);
    }

    if (method === "POST" && url.pathname === "/api/user/preferences/interests") {
      return fulfillJson(route, { success: true });
    }

    if (method === "POST" && url.pathname.startsWith("/api/guilds/")) {
      return fulfillJson(route, { members: ["user"] });
    }

    if (method === "POST" && url.pathname === "/api/events") {
      return fulfillJson(route, { success: true });
    }

    return fulfillJson(route, { success: true });
  });
}

async function registerAs(page: any, label: string, email: string) {
  await page.goto("/register", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: `Select ${label} account` }).click();
  await page.getByLabel("Register name").fill(`${label} Tester`);
  await page.getByLabel("Register email").fill(email);
  await page.getByLabel("Register password").fill("Password123!");
  await page.getByRole("button", { name: `Create ${label} account` }).click();
  await expect(page.getByText("Select your guilds")).toBeVisible({ timeout: 30000 });
}

test.describe("register account types and guild routing", () => {
  for (const row of [
    { label: "Free", plan: "free", mode: "personal" },
    { label: "Pro", plan: "pro", mode: "personal" },
    { label: "Commercial", plan: "commercial", mode: "commercial" },
    { label: "Facility", plan: "facility", mode: "facility" }
  ]) {
    test(`${row.label} signup sends ${row.plan}/${row.mode} and enters guild selection`, async ({
      page
    }) => {
      const payloads: any[] = [];
      await installRegisterMocks(page, payloads);

      await registerAs(page, row.label, `${row.plan}@example.test`);

      expect(payloads[payloads.length - 1]).toMatchObject({
        plan: row.plan,
        mode: row.mode,
        email: `${row.plan}@example.test`
      });
      await expect(
        page.getByRole("button", { name: "Continue after selecting guilds" })
      ).toBeDisabled();
    });
  }

  test("crop selection filters recommended guilds by grow interest", async ({ page }) => {
    const payloads: any[] = [];
    await installRegisterMocks(page, payloads);
    await registerAs(page, "Free", "fruit@example.test");

    await page.getByRole("button", { name: "Select Fruit Trees & Bushes" }).click();

    await expect(page.getByText("Fruit Tree Gardeners")).toBeVisible();
    await expect(page.getByText("Cannabis Facility Operators")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Continue after selecting guilds" })
    ).toBeEnabled();
  });
});
