import { expect, test } from "@playwright/test";

const COMMERCIAL_USER = {
  id: "commercial-actions-user",
  email: "commercial-actions@example.com",
  password: "Password123",
  plan: "commercial",
  mode: "commercial"
};

function mePayload() {
  return {
    user: {
      id: COMMERCIAL_USER.id,
      email: COMMERCIAL_USER.email,
      displayName: "Commercial Operator",
      plan: COMMERCIAL_USER.plan,
      subscriptionStatus: "active"
    },
    ctx: {
      mode: "commercial",
      plan: "commercial",
      subscriptionStatus: "active",
      facilityId: null,
      facilityRole: null,
      capabilities: {
        COMMERCIAL_HOME: true,
        COMMERCIAL_INVENTORY_VIEW: true,
        COMMERCIAL_INVENTORY_WRITE: true,
        COMMERCIAL_FEED_VIEW: true,
        STORE_FRONT_VIEW: true
      },
      limits: {}
    }
  };
}

async function installCommercialMocks(page: any) {
  const apiCalls: Array<{ method: string; path: string; body: any }> = [];

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
    const path = url.pathname;
    const body = request.postDataJSON?.() ?? null;
    apiCalls.push({ method, path, body });

    if (method === "POST" && path === "/api/auth/login") {
      return fulfillJson(route, {
        token: "commercial-actions-token",
        user: mePayload().user
      });
    }

    if (method === "GET" && (path === "/api/me" || path === "/api/auth/me")) {
      return fulfillJson(route, mePayload());
    }

    if (method === "GET" && path === "/api/commercial/inventory") {
      return fulfillJson(route, {
        inventory: [
          {
            id: "inv-1",
            name: "Living Soil Blend",
            sku: "SOIL-1",
            quantity: 4,
            unit: "bags",
            reorderPoint: 5,
            category: "soil"
          }
        ]
      });
    }

    if (method === "GET" && path === "/api/commercial/storefront") {
      return fulfillJson(route, {
        storefront: {
          id: "store-1",
          name: "Living Soil Labs",
          slug: "living-soil-labs",
          description: "Inputs and education.",
          isPublished: false
        }
      });
    }

    if (method === "PATCH" && path === "/api/commercial/storefront") {
      return fulfillJson(route, { storefront: { id: "store-1", ...body } });
    }

    if (method === "GET" && path === "/api/commercial/products") {
      return fulfillJson(route, {
        products: [
          {
            id: "prod-1",
            name: "Soil Kit",
            priceCents: 2500,
            currency: "usd",
            status: "published"
          }
        ]
      });
    }

    if (method === "POST" && path === "/api/commercial/products") {
      return fulfillJson(route, {
        product: {
          id: "prod-created",
          ...body,
          priceCents: Math.round(Number(body?.price || 0) * 100)
        }
      });
    }

    if (method === "GET" && path === "/api/commercial/orders") {
      return fulfillJson(route, {
        orders: [
          {
            id: "order-1",
            productName: "Soil Kit",
            customerName: "Buyer One",
            customerEmail: "buyer@example.com",
            quantity: 1,
            total: 25,
            currency: "usd",
            status: "paid",
            fulfillmentStatus: "unfulfilled",
            createdAt: "2026-03-01T00:00:00.000Z"
          }
        ]
      });
    }

    if (method === "PATCH" && path === "/api/commercial/orders/order-1") {
      return fulfillJson(route, {
        order: {
          id: "order-1",
          productName: "Soil Kit",
          customerName: "Buyer One",
          total: 25,
          status: "paid",
          fulfillmentStatus: body?.fulfillmentStatus || "fulfilled"
        }
      });
    }

    if (method === "GET" && path === "/api/commercial/feed") {
      return fulfillJson(route, {
        items: [
          {
            id: "post-1",
            type: "education",
            title: "Soil biology note",
            body: "Keep biology alive.",
            tags: ["soil"],
            likeCount: 2,
            createdAt: "2026-03-01T00:00:00.000Z",
            author: { displayName: "Living Soil Labs" }
          }
        ]
      });
    }

    if (method === "POST" && path === "/api/commercial/posts") {
      return fulfillJson(route, {
        post: {
          id: "post-created",
          type: body?.type || "update",
          title: body?.title || "",
          body: body?.body || "",
          tags: body?.tags || [],
          likeCount: 0,
          createdAt: "2026-03-02T00:00:00.000Z",
          author: { displayName: "Commercial Operator" }
        }
      });
    }

    if (method === "GET" && path === "/api/commercial/campaigns") {
      return fulfillJson(route, {
        campaigns: [
          {
            id: "campaign-1",
            name: "Spring Launch",
            description: "Awareness push",
            objective: "awareness",
            platform: "multi",
            status: "draft",
            total: 500,
            spent: 0,
            createdAt: "2026-03-01T00:00:00.000Z"
          }
        ]
      });
    }

    if (method === "POST" && path === "/api/commercial/campaigns") {
      return fulfillJson(route, { campaign: { id: "campaign-created", ...body } });
    }

    if (method === "PATCH" && path === "/api/commercial/campaigns/campaign-1") {
      return fulfillJson(route, {
        campaign: {
          id: "campaign-1",
          name: "Spring Launch",
          description: "Awareness push",
          objective: "awareness",
          platform: "multi",
          status: body?.status || "active",
          total: 500,
          spent: 0
        }
      });
    }

    if (method === "DELETE" && path === "/api/commercial/campaigns/campaign-1") {
      return fulfillJson(route, { ok: true });
    }

    if (method === "GET" && path === "/api/logs") {
      return fulfillJson(route, {
        logs: [
          {
            id: "log-1",
            title: "Tool output",
            notes: "Saved AI/tool output",
            type: "AI",
            tags: ["commercial"],
            createdAt: "2026-03-01T00:00:00.000Z",
            linkedToolRunId: "tool-1"
          }
        ]
      });
    }

    return fulfillJson(route, { success: true });
  });

  return apiCalls;
}

async function login(page: any) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Email").fill(COMMERCIAL_USER.email);
  await page.getByPlaceholder("Password").fill(COMMERCIAL_USER.password);
  await page.getByText("Sign in").last().click();
  await expect(page.getByText("Brand Dashboard")).toBeVisible({ timeout: 30000 });
}

async function backToCommercialHome(page: any) {
  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page.getByText("Brand Dashboard")).toBeVisible({ timeout: 30000 });
}

test.describe("commercial dashboard actions", () => {
  test("commercial cards and write buttons hit real API contracts", async ({ page }) => {
    const apiCalls = await installCommercialMocks(page);
    await login(page);

    await page.getByText("Open Inventory").click();
    await expect(page.getByText("Commercial Inventory")).toBeVisible();
    await expect(page.getByText("Living Soil Blend")).toBeVisible();

    await backToCommercialHome(page);
    await page.getByText("Open Storefront").click();
    await expect(page.getByText("Storefront Settings", { exact: true })).toBeVisible();
    await page.getByLabel("Publish storefront").click();
    await page.getByLabel("Save storefront settings").click();
    await expect(page.getByText("Storefront saved.")).toBeVisible();
    await page.getByLabel("Product name").fill("Compost Tea Kit");
    await page.getByLabel("Product price dollars").fill("42");
    await page.getByLabel("Create storefront product").click();
    await expect(page.getByText("Product created.")).toBeVisible();

    await backToCommercialHome(page);
    await page.getByText("Open Orders").click();
    await expect(page.getByText("Orders").first()).toBeVisible();
    await page.getByLabel("Mark order Soil Kit fulfilled").click();
    await expect(page.getByText("Soil Kit marked fulfilled.")).toBeVisible();

    await backToCommercialHome(page);
    await page.getByText("Open Feed").click();
    await expect(page.getByText("Commercial Feed")).toBeVisible();
    await page.getByLabel("Feed post title").fill("Batch note");
    await page.getByLabel("Feed post body").fill("Educational inventory update.");
    await page.getByLabel("Publish feed post").click();
    await expect(page.getByText("Feed post published.")).toBeVisible();

    await backToCommercialHome(page);
    await page.getByText("Open Campaigns").click();
    await expect(page.getByText("Campaigns").first()).toBeVisible();
    await page.getByLabel("Campaign name").fill("Retail Push");
    await page.getByLabel("Campaign total budget").fill("1000");
    await page.getByLabel("Create campaign").click();
    await expect(page.getByText("Campaign created.")).toBeVisible();
    await page.getByLabel("Activate campaign Spring Launch").click();
    await expect(page.getByText("Spring Launch set to active.")).toBeVisible();

    await backToCommercialHome(page);
    await page.getByText("Open Logs").click();
    await expect(page.getByText("Tool output")).toBeVisible();
    await expect(page.getByText("Open Log")).toBeVisible();

    expect(
      apiCalls.some(
        (call) =>
          call.method === "PATCH" &&
          call.path === "/api/commercial/storefront" &&
          call.body?.isPublished === true
      )
    ).toBeTruthy();
    expect(
      apiCalls.some(
        (call) => call.method === "POST" && call.path === "/api/commercial/products"
      )
    ).toBeTruthy();
    expect(
      apiCalls.some(
        (call) =>
          call.method === "PATCH" &&
          call.path === "/api/commercial/orders/order-1" &&
          call.body?.fulfillmentStatus === "fulfilled"
      )
    ).toBeTruthy();
    expect(
      apiCalls.some(
        (call) => call.method === "POST" && call.path === "/api/commercial/posts"
      )
    ).toBeTruthy();
    expect(
      apiCalls.some(
        (call) => call.method === "POST" && call.path === "/api/commercial/campaigns"
      )
    ).toBeTruthy();
    expect(
      apiCalls.some(
        (call) =>
          call.method === "PATCH" &&
          call.path === "/api/commercial/campaigns/campaign-1" &&
          call.body?.status === "active"
      )
    ).toBeTruthy();
  });
});
