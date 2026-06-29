import { expect, test } from "@playwright/test";

const CHECKOUT_PATH = "/__stripe_checkout__/session/no-purchase-smoke";

async function installCheckoutMocks(page: any, checkoutPayloads: any[]) {
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

    if (method === "GET" && url.pathname === CHECKOUT_PATH) {
      return fulfillJson(route, { checkout: "mock" });
    }

    if (
      method === "POST" &&
      url.pathname === "/api/subscription/create-checkout-session"
    ) {
      checkoutPayloads.push(request.postDataJSON());
      const headers = request.headers();
      const pageOrigin = headers.origin || new URL(headers.referer).origin;
      return fulfillJson(route, { url: `${pageOrigin}${CHECKOUT_PATH}` });
    }

    if (
      method === "GET" &&
      (url.pathname === "/api/me" || url.pathname === "/api/auth/me")
    ) {
      return fulfillJson(route, {
        user: {
          id: "checkout-user",
          email: "checkout@example.test",
          displayName: "Checkout User",
          plan: "commercial",
          subscriptionStatus: "inactive"
        },
        ctx: {
          mode: "commercial",
          plan: "commercial",
          subscriptionStatus: "inactive",
          capabilities: {},
          limits: {}
        }
      });
    }

    return fulfillJson(route, { success: true });
  });
}

test.describe("walkthrough before unpaid checkout", () => {
  test("commercial walkthrough appears before checkout and checkout can be closed before payment", async ({
    page
  }) => {
    const checkoutPayloads: any[] = [];
    await installCheckoutMocks(page, checkoutPayloads);

    await page.goto("/onboarding/walkthroughs?plan=commercial&mode=commercial", {
      waitUntil: "domcontentloaded"
    });

    await expect(page.getByText("Commercial walkthrough")).toBeVisible();
    await expect(page.getByText("Keep paid access gated")).toBeVisible();
    await expect(page.getByText(/Paid tools stay locked until checkout/)).toBeVisible();

    await page.getByRole("button", { name: "Continue to Commercial checkout" }).click();
    await expect(page.getByText("Choose your GrowPath plan")).toBeVisible({
      timeout: 15000
    });

    await page.getByRole("button", { name: "Start Commercial checkout" }).click();
    await expect(page).toHaveURL(new RegExp(`${CHECKOUT_PATH}$`), {
      timeout: 15000
    });

    expect(checkoutPayloads[checkoutPayloads.length - 1]).toMatchObject({
      plan: "commercial",
      interval: "monthly"
    });
    expect(checkoutPayloads[checkoutPayloads.length - 1].successUrl).toContain(
      "/offers?subscription=success"
    );
    expect(checkoutPayloads[checkoutPayloads.length - 1].cancelUrl).toContain(
      "/offers?subscription=canceled"
    );
  });

  test("yearly facility checkout sends yearly interval after walkthrough", async ({
    page
  }) => {
    const checkoutPayloads: any[] = [];
    await installCheckoutMocks(page, checkoutPayloads);

    await page.goto("/onboarding/walkthroughs?plan=facility&mode=facility", {
      waitUntil: "domcontentloaded"
    });
    await expect(page.getByText("Facility walkthrough")).toBeVisible();
    await page.getByRole("button", { name: "Continue to Facility checkout" }).click();

    await page.getByRole("button", { name: "Yearly billing" }).click();
    await page.getByRole("button", { name: "Start Facility checkout" }).click();
    await expect(page).toHaveURL(new RegExp(`${CHECKOUT_PATH}$`), {
      timeout: 15000
    });

    expect(checkoutPayloads[checkoutPayloads.length - 1]).toMatchObject({
      plan: "facility",
      interval: "yearly"
    });
  });
});
