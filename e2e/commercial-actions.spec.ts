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
    window.localStorage.setItem("auth_token_v1", "commercial-actions-token");
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

    if (method === "GET" && path === "/api/commercial/dashboard") {
      return fulfillJson(route, {
        dashboard: {
          storefront: { slug: "growpath-demo-store" },
          counts: {
            activeTrials: 1,
            completedTrials: 1,
            productsMissingCompletedTrials: 1,
            batches: 1,
            productLines: 1,
            products: 1,
            productsMissingBatches: 0,
            storefrontViews: 12,
            inventory: 1,
            lowStock: 1,
            externalLeads: 2,
            orders: 0,
            draftPosts: 1,
            draftCourses: 1,
            courses: 1,
            posts: 1,
            adClicks: 9,
            externalClicks: 4,
            productViews: 7
          }
        }
      });
    }

    if (method === "GET" && path === "/api/commercial/grows") {
      return fulfillJson(route, {
        grows: [
          {
            id: "grow-1",
            name: "Tomato Soil Trial",
            purpose: "soil_trial",
            cropType: "tomato",
            cultivar: "Sunviva / Primabella",
            medium: "outdoor soil",
            plantCount: 4,
            publicShareStatus: "evidence_building",
            measurementPlan: "vigor, soil comparison, harvest quality notes",
            harvestQualityNotes: "Sweet, aromatic fruit after recovery.",
            commercialCropSummary: "Sonnerde outperformed Neudorff until correction.",
            status: "active"
          }
        ]
      });
    }

    if (method === "POST" && path === "/api/commercial/grows") {
      return fulfillJson(route, { grow: { id: "grow-created", ...body } });
    }

    if (method === "GET" && path === "/api/commercial/product-lines") {
      return fulfillJson(route, {
        productLines: [
          {
            id: "line-1",
            name: "Living Soil Line",
            category: "soil",
            publicSummary: "Purpose-built soils and amendments.",
            status: "testing"
          }
        ]
      });
    }

    if (method === "POST" && path === "/api/commercial/product-lines") {
      return fulfillJson(route, { productLine: { id: "line-created", ...body } });
    }

    if (method === "GET" && path === "/api/commercial/batches") {
      return fulfillJson(route, {
        batches: [
          {
            id: "batch-1",
            batchName: "Veg Soil Batch",
            purpose: "veg",
            formulaVersion: "v1",
            releaseTimelineNotes: "Fast N plus slow background fertility.",
            guaranteedAnalysisNotes: "3-1-1 target with compost uncertainty.",
            status: "ready"
          }
        ]
      });
    }

    if (method === "POST" && path === "/api/commercial/batches") {
      return fulfillJson(route, { batch: { id: "batch-created", ...body } });
    }

    if (method === "GET" && path === "/api/commercial/trials") {
      return fulfillJson(route, {
        trials: [
          {
            id: "trial-1",
            trialName: "Tomato Soil Trial",
            purpose: "long_term_soil_performance",
            cropType: "tomato",
            cultivar: "Sunviva / Primabella",
            effectivenessSummary:
              "Tracked soil performance, recovery, harvest, and flavor.",
            harvestQualityNotes: "Sweet/aromatic harvest notes captured.",
            commercialCropSummary: "Supplier soil issue and correction documented.",
            status: "active"
          }
        ]
      });
    }

    if (method === "POST" && path === "/api/commercial/trials") {
      return fulfillJson(route, { trial: { id: "trial-created", ...body } });
    }

    if (method === "GET" && path === "/api/commercial/courses") {
      return fulfillJson(route, {
        courses: [
          {
            id: "course-1",
            title: "Using Living Soil",
            category: "soil",
            access: "free",
            status: "draft"
          }
        ]
      });
    }

    if (method === "POST" && path === "/api/commercial/courses") {
      return fulfillJson(route, { course: { id: "course-created", ...body } });
    }

    if (method === "GET" && path === "/api/commercial/analytics/overview") {
      return fulfillJson(route, {
        overview: {
          adClicks: 9,
          marketingClicks: 6,
          linkClicks: 5,
          productCheckoutClicks: 4,
          externalCheckoutLeads: 2,
          productViews: 7,
          storefrontViews: 12,
          brandProfileViews: 3,
          feedClicks: 5,
          courseStarts: 2,
          forumReplies: 1,
          activeTrials: 1,
          completedTrials: 1,
          breakdowns: {
            ads: [{ key: "spring-ad", label: "Spring Ad", count: 9 }],
            products: [{ key: "prod-1", label: "Soil Kit", count: 7 }],
            links: [{ key: "storefront", label: "Storefront link", count: 5 }]
          }
        }
      });
    }

    if (method === "POST" && path === "/api/commercial/analytics/events") {
      return fulfillJson(route, { ok: true });
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
          name: "GrowPath Demo Store",
          slug: "growpath-demo-store",
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
            author: { displayName: "GrowPath Demo Store" }
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
  await page.goto("/home/commercial", { waitUntil: "domcontentloaded" });
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

    await expect(page.getByText("Grows & Trials")).toBeVisible();
    await expect(page.getByText("Products & Storefront")).toBeVisible();
    await expect(page.getByText("Analytics Snapshot")).toBeVisible();
    await expect(page.getByText("Ad clicks", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open Grows" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Product Trials" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Storefront" })).toBeVisible();

    await page.getByRole("link", { name: "Open Grows" }).click();
    await expect(page.getByText("Commercial grow workspace")).toBeVisible();
    await page.getByLabel("Commercial grow name").fill("Pepper Input Trial");
    await page.getByLabel("Commercial grow purpose").fill("product_trial");
    await page.getByLabel("Commercial grow crop type").fill("pepper");
    await page.getByLabel("Commercial grow cultivar").fill("Lunchbox Red");
    await page.getByLabel("Commercial grow plant count").fill("12");
    await page.getByLabel("Create commercial grow").click();
    await expect
      .poll(() =>
        apiCalls.some(
          (call) =>
            call.method === "POST" &&
            call.path === "/api/commercial/grows" &&
            call.body?.name === "Pepper Input Trial"
        )
      )
      .toBeTruthy();

    await backToCommercialHome(page);
    await page.getByRole("link", { name: "Product Lines" }).first().click();
    await expect(page.getByText("Create Product Line").first()).toBeVisible();
    await page.getByLabel("Product line name").fill("Tomato Soil Line");
    await page.getByLabel("Product line category").fill("soil");
    await page
      .getByLabel("Product line public summary")
      .fill("Commercial tomato soil trials.");
    await page.getByLabel("Create product line").click();
    await expect
      .poll(() =>
        apiCalls.some(
          (call) =>
            call.method === "POST" &&
            call.path === "/api/commercial/product-lines" &&
            call.body?.name === "Tomato Soil Line"
        )
      )
      .toBeTruthy();

    await backToCommercialHome(page);
    await page.getByRole("link", { name: "Products" }).first().click();
    await expect(page.getByText("Product catalog")).toBeVisible();
    await page.getByLabel("Commercial product name").fill("Compost Tea Kit");
    await page.getByLabel("Commercial product price").fill("42");
    await page
      .getByLabel("Commercial product external purchase URL")
      .fill("https://example.com/tea-kit");
    await page.getByLabel("Create commercial product").click();
    await expect
      .poll(() =>
        apiCalls.some(
          (call) =>
            call.method === "POST" &&
            call.path === "/api/commercial/products" &&
            call.body?.name === "Compost Tea Kit"
        )
      )
      .toBeTruthy();

    await backToCommercialHome(page);
    await page.getByRole("link", { name: "Batch Planner" }).first().click();
    await expect(page.getByText("Create commercial batch")).toBeVisible();
    await page.getByLabel("Commercial batch name").fill("Veg Soil Batch 2");
    await page.getByLabel("Commercial batch purpose").fill("veg");
    await page.getByLabel("Commercial batch formula version").fill("v2");
    await page
      .getByLabel("Commercial batch guaranteed analysis notes")
      .fill("3-1-1 target with fast N plus slow background fertility.");
    await page
      .getByLabel("Commercial batch release timeline notes")
      .fill("Fast nitrogen, medium compost, slow minerals.");
    await page.getByLabel("Create commercial batch").click();
    await expect
      .poll(() =>
        apiCalls.some(
          (call) =>
            call.method === "POST" &&
            call.path === "/api/commercial/batches" &&
            call.body?.batchName === "Veg Soil Batch 2"
        )
      )
      .toBeTruthy();

    await backToCommercialHome(page);
    await page.getByRole("link", { name: "Product Trials" }).click();
    await expect(page.getByText("Create Product Trial").first()).toBeVisible();
    await page.getByLabel("Product trial name").fill("Tomato Trial 2");
    await page.getByLabel("Product trial purpose").fill("long_term_soil_performance");
    await page.getByLabel("Trial crop type").fill("tomato");
    await page.getByLabel("Trial cultivar").fill("Sunviva");
    await page.getByLabel("Trial plant count").fill("4");
    await page
      .getByLabel("Trial notes")
      .fill("Harvest quality notes, commercial crop summary, soil comparison.");
    await page.getByLabel("Create product trial").click();
    await expect
      .poll(() =>
        apiCalls.some(
          (call) =>
            call.method === "POST" &&
            call.path === "/api/commercial/trials" &&
            call.body?.trialName === "Tomato Trial 2"
        )
      )
      .toBeTruthy();

    await backToCommercialHome(page);
    await page.getByRole("link", { name: "Inventory", exact: true }).click();
    await expect(page.getByText("Commercial Inventory", { exact: true })).toBeVisible();
    await expect(page.getByText("Living Soil Blend")).toBeVisible();

    await backToCommercialHome(page);
    await page.getByRole("link", { name: "Storefront" }).first().click();
    await expect(page.getByText("Storefront Settings", { exact: true })).toBeVisible();
    await page.getByLabel("Publish storefront").click();
    await page.getByLabel("Save storefront settings").click();
    await expect(page.getByText("Storefront saved.")).toBeVisible();
    await page.getByLabel("Product name").fill("Compost Tea Kit");
    await page.getByLabel("Product price dollars").fill("42");
    await page.getByLabel("Create storefront product").click();
    await expect(page.getByText("Product created.")).toBeVisible();

    await backToCommercialHome(page);
    await page.getByRole("link", { name: "Feed", exact: true }).click();
    await expect(page.getByText("Commercial Feed")).toBeVisible();
    await page.getByLabel("Feed post title").fill("Batch note");
    await page.getByLabel("Feed post body").fill("Educational inventory update.");
    await page.getByLabel("Publish feed post").click();
    await expect(page.getByText("Feed post published.")).toBeVisible();

    await backToCommercialHome(page);
    await page.getByRole("link", { name: "Create Course" }).click();
    await expect(page.getByText("Create commercial course").first()).toBeVisible();
    await page.getByLabel("Commercial course title").fill("Tomato Soil Basics");
    await page
      .getByLabel("Commercial course description")
      .fill("Free course for soil product users.");
    await page.getByLabel("Create commercial course").click();
    await expect
      .poll(() =>
        apiCalls.some(
          (call) =>
            call.method === "POST" &&
            call.path === "/api/commercial/courses" &&
            call.body?.title === "Tomato Soil Basics"
        )
      )
      .toBeTruthy();

    await backToCommercialHome(page);
    await page.getByRole("link", { name: "Marketing Planner" }).click();
    await expect(page.getByText("Marketing Planner").first()).toBeVisible();
    await page.getByLabel("Marketing plan name").fill("Retail Push");
    await page
      .getByLabel("Marketing plan target URL")
      .fill("https://example.com/tea-kit");
    await page.getByLabel("Create marketing plan").click();
    await expect
      .poll(() =>
        apiCalls.some(
          (call) =>
            call.method === "POST" &&
            call.path === "/api/commercial/campaigns" &&
            call.body?.name === "Retail Push"
        )
      )
      .toBeTruthy();

    await backToCommercialHome(page);
    await page.getByRole("link", { name: "Analytics" }).click();
    await expect(page.getByText("Commercial Analytics")).toBeVisible();
    await expect(page.getByText("Ad and marketing click counts")).toBeVisible();
    await expect(page.getByText("Spring Ad")).toBeVisible();

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
        (call) => call.method === "POST" && call.path === "/api/commercial/grows"
      )
    ).toBeTruthy();
    expect(
      apiCalls.some(
        (call) => call.method === "POST" && call.path === "/api/commercial/product-lines"
      )
    ).toBeTruthy();
    expect(
      apiCalls.some(
        (call) => call.method === "POST" && call.path === "/api/commercial/batches"
      )
    ).toBeTruthy();
    expect(
      apiCalls.some(
        (call) => call.method === "POST" && call.path === "/api/commercial/trials"
      )
    ).toBeTruthy();
    expect(
      apiCalls.some(
        (call) => call.method === "POST" && call.path === "/api/commercial/posts"
      )
    ).toBeTruthy();
    expect(
      apiCalls.some(
        (call) => call.method === "POST" && call.path === "/api/commercial/courses"
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
          call.method === "GET" && call.path === "/api/commercial/analytics/overview"
      )
    ).toBeTruthy();
  });
});
