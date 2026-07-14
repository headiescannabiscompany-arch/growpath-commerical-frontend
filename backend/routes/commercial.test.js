const request = require("supertest");
const express = require("express");
const liveTestPacks = require("../../tests/fixtures/growpath-live-test-packs.json");

const TEST_USER = "user-commercial-1";

let rows = [];

function makeDoc(row) {
  return {
    ...row,
    toObject: () => row
  };
}

function matchValue(actual, expected) {
  if (expected && typeof expected === "object") {
    if (Array.isArray(expected.$in)) return expected.$in.includes(actual);
    if (expected.$regex) {
      return new RegExp(expected.$regex, expected.$options || "").test(
        String(actual || "")
      );
    }
  }
  return actual === expected;
}

function getPath(row, path) {
  return String(path)
    .split(".")
    .reduce((current, key) => (current ? current[key] : undefined), row);
}

function matches(row, query = {}) {
  return Object.entries(query).every(([key, expected]) => {
    if (key === "$or") return expected.some((sub) => matches(row, sub));
    if (key === "$and") return expected.every((sub) => matches(row, sub));
    return matchValue(getPath(row, key), expected);
  });
}

function chain(items) {
  return {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(items)
  };
}

function one(item) {
  return {
    lean: jest.fn().mockResolvedValue(item)
  };
}

function applyPatch(row, patch) {
  const next = { ...row, payload: { ...(row.payload || {}) } };
  for (const [key, value] of Object.entries(patch || {})) {
    if (key === "$set") {
      for (const [setKey, setValue] of Object.entries(value || {})) {
        if (setKey.startsWith("payload.")) {
          next.payload[setKey.slice("payload.".length)] = setValue;
        } else {
          next[setKey] = setValue;
        }
      }
    } else if (key.startsWith("payload.")) {
      next.payload[key.slice("payload.".length)] = value;
    } else {
      next[key] = value;
    }
  }
  return next;
}

const mockCommercialRecord = {
  find: jest.fn((query) => chain(rows.filter((row) => matches(row, query)))),
  findOne: jest.fn((query) => one(rows.find((row) => matches(row, query)) || null)),
  countDocuments: jest.fn((query) =>
    Promise.resolve(rows.filter((row) => matches(row, query)).length)
  ),
  create: jest.fn(async (data) => {
    const row = {
      _id: `rec-${rows.length + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      ...data
    };
    rows.unshift(row);
    return makeDoc(row);
  }),
  findOneAndUpdate: jest.fn((query, patch, options = {}) => {
    const index = rows.findIndex((row) => matches(row, query));
    if (index >= 0) {
      rows[index] = applyPatch(rows[index], patch);
      rows[index].updatedAt = new Date().toISOString();
      return one(rows[index]);
    }
    if (options.upsert) {
      const row = {
        _id: `rec-${rows.length + 1}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        ...query,
        ...applyPatch({}, patch)
      };
      rows.unshift(row);
      return one(row);
    }
    return one(null);
  })
};

jest.mock("../models/CommercialRecord", () => mockCommercialRecord);

function createApp(withUser = true) {
  const app = express();
  app.use(express.json());
  if (withUser) {
    app.use((req, _res, next) => {
      req.userId = TEST_USER;
      req.user = { _id: TEST_USER, id: TEST_USER };
      next();
    });
  }
  app.use("/api/commercial", require("./commercial"));
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ message: err.message || "error" });
  });
  return app;
}

function createFacilityApp({
  userId = TEST_USER,
  facilityId = "facility-1",
  facilityRole = "OWNER"
} = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.userId = userId;
    req.user = { _id: userId, id: userId };
    req.ctx = { userId, facilityId, facilityRole };
    next();
  });
  app.use("/api/commercial", require("./commercial"));
  return app;
}

function livePack(accountType) {
  const pack = liveTestPacks.packs.find((item) => item.accountType === accountType);
  if (!pack) throw new Error(`Missing ${accountType} live test pack`);
  return pack;
}

function liveWeek(pack, week) {
  const log = pack.weeklyLogs.find((item) => item.week === week);
  if (!log) throw new Error(`Missing week ${week} from ${pack.id}`);
  return log;
}

describe("commercial backend routes", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    rows = [];
    app = createApp();
  });

  test("creates and lists product lines for the current commercial user", async () => {
    const create = await request(app).post("/api/commercial/product-lines").send({
      name: "Living Soil Line",
      category: "soil",
      publicSummary: "Purpose-built soil"
    });

    expect(create.status).toBe(201);
    expect(create.body.productLine).toMatchObject({
      name: "Living Soil Line",
      category: "soil",
      userId: TEST_USER
    });

    const list = await request(app).get("/api/commercial/product-lines");
    expect(list.status).toBe(200);
    expect(list.body.productLines).toHaveLength(1);
    expect(list.body.productLines[0].name).toBe("Living Soil Line");

    const detail = await request(app).get(
      `/api/commercial/product-lines/${create.body.productLine.id}`
    );
    expect(detail.status).toBe(200);
    expect(detail.body.productLine).toMatchObject({
      name: "Living Soil Line",
      category: "soil"
    });

    const updated = await request(app)
      .patch(`/api/commercial/product-lines/${create.body.productLine.id}`)
      .send({
        status: "active",
        publicSummary: "Updated public summary.",
        description: "Updated line description."
      });
    expect(updated.status).toBe(200);
    expect(updated.body.productLine).toMatchObject({
      status: "active",
      publicSummary: "Updated public summary.",
      description: "Updated line description."
    });
  });

  test("aggregates commercial dashboard action sections from records", async () => {
    rows.push(
      {
        _id: "product-no-batch",
        userId: TEST_USER,
        recordType: "product",
        name: "Untested Mix",
        status: "published",
        payload: { name: "Untested Mix", status: "published" },
        updatedAt: "2026-01-06T00:00:00.000Z",
        deletedAt: null
      },
      {
        _id: "product-ready",
        userId: TEST_USER,
        recordType: "product",
        name: "Tested Mix",
        status: "published",
        payload: { name: "Tested Mix", status: "published" },
        updatedAt: "2026-01-05T00:00:00.000Z",
        deletedAt: null
      },
      {
        _id: "batch-ready",
        userId: TEST_USER,
        recordType: "soilNutrientBatch",
        name: "Tested Mix Batch",
        status: "ready",
        payload: { name: "Tested Mix Batch", productId: "product-ready" },
        updatedAt: "2026-01-04T00:00:00.000Z",
        deletedAt: null
      },
      {
        _id: "trial-complete",
        userId: TEST_USER,
        recordType: "productTrial",
        name: "Tested Mix Trial",
        status: "complete",
        payload: { trialName: "Tested Mix Trial", productId: "product-ready" },
        updatedAt: "2026-01-03T00:00:00.000Z",
        deletedAt: null
      },
      {
        _id: "trial-active",
        userId: TEST_USER,
        recordType: "productTrial",
        name: "Active Trial",
        status: "active",
        payload: { trialName: "Active Trial", productId: "product-no-batch" },
        updatedAt: "2026-01-02T00:00:00.000Z",
        deletedAt: null
      },
      {
        _id: "lead-1",
        userId: TEST_USER,
        recordType: "order",
        name: "External lead",
        status: "external_lead",
        payload: { productId: "product-ready", external: true },
        updatedAt: "2026-01-02T00:00:00.000Z",
        deletedAt: null
      },
      {
        _id: "inventory-low",
        userId: TEST_USER,
        recordType: "inventory",
        name: "Kelp Meal",
        status: "active",
        payload: { name: "Kelp Meal", quantity: 2, lowStockThreshold: 5 },
        updatedAt: "2026-01-02T00:00:00.000Z",
        deletedAt: null
      },
      {
        _id: "course-draft",
        userId: TEST_USER,
        recordType: "course",
        name: "Usage Course",
        status: "draft",
        payload: { title: "Usage Course", status: "draft" },
        updatedAt: "2026-01-02T00:00:00.000Z",
        deletedAt: null
      },
      {
        _id: "post-draft",
        userId: TEST_USER,
        recordType: "post",
        name: "Launch Post",
        status: "draft",
        payload: { title: "Launch Post", status: "draft" },
        updatedAt: "2026-01-02T00:00:00.000Z",
        deletedAt: null
      },
      {
        _id: "event-1",
        userId: TEST_USER,
        recordType: "analyticsEvent",
        name: "ad_click",
        status: "active",
        payload: { eventType: "ad_click" },
        createdAt: "2026-01-02T00:00:00.000Z",
        deletedAt: null
      },
      {
        _id: "event-2",
        userId: TEST_USER,
        recordType: "analyticsEvent",
        name: "product_external_link_click",
        status: "active",
        payload: { eventType: "product_external_link_click" },
        createdAt: "2026-01-02T00:00:00.000Z",
        deletedAt: null
      }
    );

    const res = await request(app).get("/api/commercial/dashboard");

    expect(res.status).toBe(200);
    expect(res.body.dashboard.counts).toMatchObject({
      products: 2,
      batches: 1,
      trials: 2,
      activeTrials: 1,
      completedTrials: 1,
      externalLeads: 1,
      lowStock: 1,
      draftCourses: 1,
      draftPosts: 1,
      productsMissingBatches: 1,
      productsMissingCompletedTrials: 1,
      adClicks: 1,
      externalClicks: 1
    });
    expect(res.body.dashboard.sections.productsMissingBatches[0].name).toBe(
      "Untested Mix"
    );
    expect(res.body.dashboard.sections.productsMissingCompletedTrials[0].name).toBe(
      "Untested Mix"
    );
    expect(res.body.dashboard.sections.lowStock[0].name).toBe("Kelp Meal");
    expect(res.body.dashboard.actionItems.map((item) => item.type)).toEqual(
      expect.arrayContaining([
        "product_missing_batch",
        "product_missing_completed_trial",
        "low_stock"
      ])
    );
  });

  test("publishes storefront and returns public storefront with products and trials", async () => {
    await request(app).patch("/api/commercial/storefront").send({
      name: "Living Soil Labs",
      slug: "living-soil-labs",
      description: "Soil and nutrient products.",
      status: "published"
    });
    await request(app).post("/api/commercial/products").send({
      name: "Veg Mix",
      status: "published",
      externalPurchaseUrl: "https://example.com/veg"
    });
    await request(app).post("/api/commercial/trials").send({
      trialName: "Veg Mix Trial",
      status: "active"
    });

    const res = await request(app).get(
      "/api/commercial/storefront/public/living-soil-labs"
    );

    expect(res.status).toBe(200);
    expect(res.body.storefront.name).toBe("Living Soil Labs");
    expect(res.body.products[0]).toMatchObject({
      name: "Veg Mix",
      externalPurchaseUrl: "https://example.com/veg"
    });
    expect(res.body.trials[0].trialName).toBe("Veg Mix Trial");
  });

  test("searches public storefronts by storefront and product metadata", async () => {
    rows.push(
      {
        _id: "soil-store",
        userId: "soil-user",
        recordType: "storefront",
        name: "Living Soil Labs",
        slug: "living-soil-labs",
        status: "published",
        payload: {
          name: "Living Soil Labs",
          slug: "living-soil-labs",
          businessType: "soil_nutrient_brand",
          tags: ["soil", "nutrients"]
        },
        updatedAt: "2026-01-03T00:00:00.000Z",
        deletedAt: null
      },
      {
        _id: "seed-store",
        userId: "seed-user",
        recordType: "storefront",
        name: "Seed House",
        slug: "seed-house",
        status: "published",
        payload: { name: "Seed House", slug: "seed-house", tags: ["seeds"] },
        updatedAt: "2026-01-02T00:00:00.000Z",
        deletedAt: null
      },
      {
        _id: "soil-product",
        userId: "soil-user",
        recordType: "product",
        name: "Flower Soil Mix",
        status: "published",
        payload: {
          name: "Flower Soil Mix",
          category: "soil",
          tags: ["flower", "living soil"]
        },
        updatedAt: "2026-01-04T00:00:00.000Z",
        deletedAt: null
      }
    );

    const res = await request(createApp(false)).get(
      "/api/commercial/storefront/public?q=flower&limit=10"
    );

    expect(res.status).toBe(200);
    expect(res.body.brands).toHaveLength(1);
    expect(res.body.brands[0]).toMatchObject({
      name: "Living Soil Labs",
      relatedProductCount: 1
    });
    expect(res.body.brands[0].matchScore).toBeGreaterThan(0);
    expect(res.body.brands[0].matchReasons).toEqual(
      expect.arrayContaining(["matches flower"])
    );
  });

  test("returns similar brands using source storefront and product metadata", async () => {
    rows.push(
      {
        _id: "source-store",
        userId: "source-user",
        recordType: "storefront",
        name: "Triple Bag Genetics",
        slug: "triple-bag-genetics",
        status: "published",
        payload: {
          name: "Triple Bag Genetics",
          slug: "triple-bag-genetics",
          businessType: "breeder",
          tags: ["seeds", "genetics"]
        },
        updatedAt: "2026-01-04T00:00:00.000Z",
        deletedAt: null
      },
      {
        _id: "similar-store",
        userId: "similar-user",
        recordType: "storefront",
        name: "Seed House",
        slug: "seed-house",
        status: "published",
        payload: {
          name: "Seed House",
          slug: "seed-house",
          businessType: "breeder",
          tags: ["genetics", "seeds"]
        },
        updatedAt: "2026-01-03T00:00:00.000Z",
        deletedAt: null
      },
      {
        _id: "different-store",
        userId: "different-user",
        recordType: "storefront",
        name: "Garden Center",
        slug: "garden-center",
        status: "published",
        payload: {
          name: "Garden Center",
          slug: "garden-center",
          businessType: "retailer",
          tags: ["houseplants"]
        },
        updatedAt: "2026-01-02T00:00:00.000Z",
        deletedAt: null
      },
      {
        _id: "source-product",
        userId: "source-user",
        recordType: "product",
        name: "F1 Seed Pack",
        status: "published",
        payload: { name: "F1 Seed Pack", category: "seeds", tags: ["genetics"] },
        updatedAt: "2026-01-04T00:00:00.000Z",
        deletedAt: null
      },
      {
        _id: "similar-product",
        userId: "similar-user",
        recordType: "product",
        name: "Regular Seed Pack",
        status: "published",
        payload: { name: "Regular Seed Pack", category: "seeds", tags: ["genetics"] },
        updatedAt: "2026-01-03T00:00:00.000Z",
        deletedAt: null
      }
    );

    const res = await request(createApp(false)).get(
      "/api/commercial/storefront/public?similarTo=triple-bag-genetics&limit=5"
    );

    expect(res.status).toBe(200);
    expect(res.body.similarTo).toBe("triple-bag-genetics");
    expect(res.body.brands.map((brand) => brand.slug)).toContain("seed-house");
    expect(res.body.brands.map((brand) => brand.slug)).not.toContain(
      "triple-bag-genetics"
    );
    expect(res.body.brands[0].matchScore).toBeGreaterThan(0);
    expect(res.body.brands[0].matchReasons.length).toBeGreaterThan(0);
  });

  test("records commercial click events and summarizes ad and link clicks", async () => {
    await request(app).post("/api/commercial/analytics/events").send({
      eventType: "ad_click",
      storefrontSlug: "living-soil-labs"
    });
    await request(app).post("/api/commercial/analytics/events").send({
      eventType: "product_external_link_click",
      storefrontSlug: "living-soil-labs"
    });
    await request(app).post("/api/commercial/analytics/events").send({
      eventType: "brand_profile_view",
      storefrontSlug: "living-soil-labs"
    });

    const res = await request(app).get("/api/commercial/analytics/overview");

    expect(res.status).toBe(200);
    expect(res.body.overview.adClicks).toBe(1);
    expect(res.body.overview.linkClicks).toBe(1);
    expect(res.body.overview.brandProfileViews).toBe(1);
    expect(res.body.overview.breakdowns.storefronts[0]).toMatchObject({
      key: "living-soil-labs",
      count: 3
    });
  });

  test("resolves public storefront analytics events to the commercial owner", async () => {
    rows.push({
      _id: "store-owned",
      userId: TEST_USER,
      recordType: "storefront",
      name: "Living Soil Labs",
      slug: "living-soil-labs",
      status: "published",
      payload: {
        name: "Living Soil Labs",
        slug: "living-soil-labs",
        status: "published"
      },
      deletedAt: null
    });

    const event = await request(createApp(false))
      .post("/api/commercial/analytics/events")
      .send({
        eventType: "ad_click",
        storefrontSlug: "living-soil-labs",
        source: "feed_ad"
      });

    expect(event.status).toBe(201);
    expect(event.body.event).toMatchObject({
      userId: TEST_USER,
      eventType: "ad_click",
      storefrontSlug: "living-soil-labs"
    });

    const overview = await request(app).get("/api/commercial/analytics/overview");
    expect(overview.status).toBe(200);
    expect(overview.body.overview.adClicks).toBe(1);
    expect(overview.body.overview.breakdowns.ads[0]).toMatchObject({
      label: "feed_ad",
      count: 1
    });
    expect(overview.body.overview.breakdowns.sources[0]).toMatchObject({
      key: "feed_ad",
      count: 1
    });
  });

  test("resolves public product analytics events to the commercial owner", async () => {
    rows.push({
      _id: "product-owned",
      userId: TEST_USER,
      recordType: "product",
      name: "Veg Mix",
      slug: "veg-mix",
      status: "published",
      payload: {
        name: "Veg Mix",
        slug: "veg-mix",
        status: "published"
      },
      deletedAt: null
    });

    const event = await request(createApp(false))
      .post("/api/commercial/analytics/events")
      .send({
        eventType: "product_view",
        objectType: "product",
        productId: "product-owned",
        source: "public_product"
      });

    expect(event.status).toBe(201);
    expect(event.body.event).toMatchObject({
      userId: TEST_USER,
      eventType: "product_view",
      productId: "product-owned"
    });

    const overview = await request(app).get("/api/commercial/analytics/overview");
    expect(overview.status).toBe(200);
    expect(overview.body.overview.productViews).toBe(1);
    expect(overview.body.overview.breakdowns.products[0]).toMatchObject({
      key: "product-owned",
      count: 1
    });
  });

  test("uses metadata labels for public storefront link click breakdowns", async () => {
    await request(app)
      .post("/api/commercial/analytics/events")
      .send({
        eventType: "storefront_public_link_click",
        storefrontSlug: "living-soil-labs",
        targetUrl: "https://example.com/public-guide",
        source: "public_storefront",
        metadata: { label: "Public Guide" }
      });

    const overview = await request(app).get("/api/commercial/analytics/overview");

    expect(overview.status).toBe(200);
    expect(overview.body.overview.breakdowns.links[0]).toMatchObject({
      key: "https://example.com/public-guide",
      label: "Public Guide",
      count: 1
    });
  });

  test("creates commercial feed posts with brand links and filters public feed", async () => {
    await request(app)
      .post("/api/commercial/posts")
      .send({
        type: "product_update",
        title: "Veg Mix drop",
        body: "New veg mix batch is live.",
        tags: ["soil", "veg"],
        linkedProductId: "product-1",
        storefrontSlug: "living-soil-labs",
        externalLinks: [{ label: "Shop", url: "https://example.com/veg" }]
      });
    await request(app)
      .post("/api/commercial/posts")
      .send({
        type: "education",
        title: "Clone tips",
        body: "Humidity matters.",
        tags: ["clones"]
      });

    const res = await request(createApp(false)).get(
      "/api/commercial/feed?type=product_update&tag=soil&q=veg"
    );

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      type: "product_update",
      title: "Veg Mix drop",
      linkedProductId: "product-1",
      storefrontSlug: "living-soil-labs"
    });
    expect(res.body.items[0].externalLinks[0].url).toBe("https://example.com/veg");
  });

  test("likes, unlikes, and comments on public commercial posts", async () => {
    rows.push({
      _id: "public-post",
      userId: "brand-user",
      recordType: "post",
      name: "Product update",
      status: "published",
      payload: {
        type: "product_update",
        title: "Product update",
        body: "Try the mix.",
        likedBy: [],
        likeCount: 0,
        commentCount: 0,
        linkedProductId: "product-1",
        storefrontSlug: "living-soil-labs"
      },
      metrics: {},
      deletedAt: null
    });

    const liked = await request(app).post("/api/commercial/like/public-post").send({});
    expect(liked.status).toBe(200);
    expect(liked.body).toMatchObject({ liked: true, likeCount: 1 });

    const comment = await request(app)
      .post("/api/commercial/comment/public-post")
      .send({ body: "Can this be used in flower?" });
    expect(comment.status).toBe(201);
    expect(comment.body.comment).toMatchObject({
      body: "Can this be used in flower?",
      linkedProductId: "product-1",
      storefrontSlug: "living-soil-labs"
    });
    expect(comment.body.commentCount).toBe(1);

    const comments = await request(createApp(false)).get(
      "/api/commercial/comments/public-post"
    );
    expect(comments.status).toBe(200);
    expect(comments.body.comments).toHaveLength(1);

    const unliked = await request(app)
      .post("/api/commercial/unlike/public-post")
      .send({});
    expect(unliked.status).toBe(200);
    expect(unliked.body).toMatchObject({ liked: false, likeCount: 0 });
  });

  test("allows public checkout for published external-link products", async () => {
    rows.push({
      _id: "public-product",
      userId: "seller-user",
      recordType: "product",
      name: "Veg Mix",
      status: "published",
      payload: {
        name: "Veg Mix",
        status: "published",
        externalPurchaseUrl: "https://example.com/veg"
      },
      deletedAt: null
    });

    const res = await request(createApp(false))
      .post("/api/commercial/products/public-product/checkout")
      .send({});

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      url: "https://example.com/veg",
      external: true
    });
    expect(res.body.lead).toMatchObject({
      productId: "public-product",
      status: "external_lead",
      source: "external_checkout"
    });
  });

  test("external product checkout creates seller-owned lead and analytics counts", async () => {
    const product = await request(app).post("/api/commercial/products").send({
      name: "Flower Mix",
      status: "published",
      externalPurchaseUrl: "https://example.com/flower",
      storefrontSlug: "living-soil-labs"
    });

    const checkout = await request(createApp(false))
      .post(`/api/commercial/products/${product.body.product.id}/checkout`)
      .send({ source: "public_storefront" });
    expect(checkout.status).toBe(200);
    expect(checkout.body.lead).toMatchObject({
      productName: "Flower Mix",
      status: "external_lead",
      targetUrl: "https://example.com/flower"
    });

    const orders = await request(app).get("/api/commercial/orders");
    expect(orders.status).toBe(200);
    expect(orders.body.orders).toHaveLength(1);
    expect(orders.body.orders[0]).toMatchObject({
      productName: "Flower Mix",
      external: true
    });

    const analytics = await request(app).get("/api/commercial/analytics/overview");
    expect(analytics.status).toBe(200);
    expect(analytics.body.overview.linkClicks).toBe(1);
    expect(analytics.body.overview.productCheckoutClicks).toBe(1);
    expect(analytics.body.overview.externalCheckoutLeads).toBe(1);
    expect(analytics.body.overview.breakdowns.products[0]).toMatchObject({
      label: "Flower Mix",
      count: 1
    });
    expect(analytics.body.overview.breakdowns.links[0]).toMatchObject({
      key: "https://example.com/flower",
      count: 1
    });
  });

  test("tracks campaign ad clicks and saved marketing link clicks", async () => {
    const campaign = await request(app).post("/api/commercial/campaigns").send({
      name: "Veg Mix Launch",
      linkedProductId: "product-1",
      targetUrl: "https://example.com/veg"
    });
    const link = await request(app).post("/api/commercial/links").send({
      label: "Shop Veg Mix",
      url: "https://example.com/veg"
    });

    const campaignClick = await request(app)
      .post(`/api/commercial/campaigns/${campaign.body.campaign.id}/click`)
      .send({ source: "banner_ad" });
    expect(campaignClick.status).toBe(200);
    expect(campaignClick.body).toMatchObject({ clickCount: 1 });
    expect(campaignClick.body.event).toMatchObject({
      eventType: "ad_click",
      linkedProductId: "product-1"
    });

    const linkClick = await request(app)
      .post(`/api/commercial/links/${link.body.link.id}/click`)
      .send({ source: "storefront" });
    expect(linkClick.status).toBe(200);
    expect(linkClick.body).toMatchObject({
      url: "https://example.com/veg",
      clickCount: 1
    });

    const analytics = await request(app).get("/api/commercial/analytics/overview");
    expect(analytics.body.overview.adClicks).toBe(1);
    expect(analytics.body.overview.marketingClicks).toBe(1);
    expect(analytics.body.overview.breakdowns.ads[0]).toMatchObject({
      label: "Veg Mix Launch",
      count: 1
    });
    expect(analytics.body.overview.breakdowns.links[0]).toMatchObject({
      label: "Shop Veg Mix",
      count: 2
    });
  });

  test("creates durable licensed facility transfer records", async () => {
    const created = await request(app).post("/api/commercial/orders").send({
      facilityId: "facility-1",
      orderType: "licensed_cannabis_transfer",
      inventoryItemId: "lot-1",
      itemName: "Flower lot 24-A",
      quantity: 10,
      unit: "lb",
      unitPrice: 900,
      total: 9000,
      recipientName: "Example Dispensary",
      recipientLicense: "D-100",
      recipientState: "ME"
    });

    expect(created.status).toBe(201);
    expect(created.body.order).toMatchObject({
      status: "draft",
      facilityId: "facility-1",
      orderType: "licensed_cannabis_transfer",
      recipientLicense: "D-100",
      total: 9000
    });

    const listed = await request(app).get("/api/commercial/orders");
    expect(listed.body.orders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ orderType: "licensed_cannabis_transfer" })
      ])
    );
  });

  test("blocks cannabis products from public storefront checkout", async () => {
    const product = await request(app).post("/api/commercial/products").send({
      name: "Cultivar lot 24-A",
      status: "published",
      category: "cannabis",
      externalPurchaseUrl: "https://example.com/checkout"
    });

    const checkout = await request(createApp(false))
      .post(`/api/commercial/products/${product.body.product.id}/checkout`)
      .send({ source: "public_storefront" });

    expect(checkout.status).toBe(403);
    expect(checkout.body).toMatchObject({
      success: false,
      code: "LICENSED_TRANSFER_REQUIRED"
    });
  });

  test("shares validated facility transfers by facility and enforces roles", async () => {
    const owner = createFacilityApp();
    const created = await request(owner)
      .post("/api/commercial/facility/facility-1/transfers")
      .send({
        facilityId: "facility-1",
        inventoryItemId: "lot-1",
        itemName: "Flower lot 24-A",
        quantity: 10,
        unit: "lb",
        unitPrice: 900,
        recipientName: "Example Dispensary",
        recipientLicense: "D-100",
        recipientState: "ME"
      });
    expect(created.status).toBe(201);
    const transferId = created.body.transfer.id;

    const viewer = createFacilityApp({ userId: "viewer-1", facilityRole: "VIEWER" });
    const listed = await request(viewer).get(
      "/api/commercial/facility/facility-1/transfers"
    );
    expect(listed.body.transfers).toHaveLength(1);
    expect(
      await request(viewer)
        .post("/api/commercial/facility/facility-1/transfers")
        .send({ facilityId: "facility-1" })
    ).toMatchObject({ status: 403 });

    const approved = await request(owner)
      .post(`/api/commercial/facility/facility-1/transfers/${transferId}/transition`)
      .send({ facilityId: "facility-1", status: "approved" });
    expect(approved.status).toBe(200);

    const staff = createFacilityApp({ userId: "staff-1", facilityRole: "STAFF" });
    const shipped = await request(staff)
      .post(`/api/commercial/facility/facility-1/transfers/${transferId}/transition`)
      .send({ facilityId: "facility-1", status: "shipped" });
    expect(shipped.body.transfer).toMatchObject({
      status: "shipped",
      inventoryMovementStatus: "pending"
    });
    const movementId = shipped.body.transfer.inventoryMovementId;

    const duplicate = await request(staff)
      .post(`/api/commercial/facility/facility-1/transfers/${transferId}/transition`)
      .send({ facilityId: "facility-1", status: "shipped" });
    expect(duplicate.status).toBe(409);

    const deliveredEarly = await request(staff)
      .post(`/api/commercial/facility/facility-1/transfers/${transferId}/transition`)
      .send({ facilityId: "facility-1", status: "delivered" });
    expect(deliveredEarly.body.code).toBe("INVENTORY_MOVEMENT_PENDING");

    const confirmed = await request(staff)
      .post(
        `/api/commercial/facility/facility-1/transfers/${transferId}/inventory-confirmed`
      )
      .send({ facilityId: "facility-1", movementId });
    expect(confirmed.body.transfer.inventoryMovementStatus).toBe("applied");

    const delivered = await request(staff)
      .post(`/api/commercial/facility/facility-1/transfers/${transferId}/transition`)
      .send({ facilityId: "facility-1", status: "delivered" });
    expect(delivered.body.transfer.status).toBe("delivered");
    expect(delivered.body.transfer.auditEvents.length).toBeGreaterThanOrEqual(5);
  });

  test("creates commercial grows and course aliases for commercial workspace", async () => {
    const grow = await request(app).post("/api/commercial/grows").send({
      name: "Formula Trial Grow",
      purpose: "product_trial",
      linkedProductId: "product-1"
    });
    expect(grow.status).toBe(201);
    expect(grow.body.grow).toMatchObject({
      name: "Formula Trial Grow",
      purpose: "product_trial"
    });

    const course = await request(app).post("/api/commercial/courses").send({
      title: "Using Veg Mix",
      status: "draft",
      linkedProductId: "product-1"
    });
    expect(course.status).toBe(201);
    expect(course.body.course).toMatchObject({
      title: "Using Veg Mix",
      linkedProductId: "product-1"
    });

    const courseDetail = await request(app).get(
      `/api/commercial/courses/${course.body.course.id}`
    );
    expect(courseDetail.status).toBe(200);
    expect(courseDetail.body.course).toMatchObject({
      title: "Using Veg Mix",
      linkedProductId: "product-1"
    });

    const lesson = await request(app)
      .post(`/api/commercial/courses/${course.body.course.id}/lessons`)
      .send({ title: "Application rate", body: "Water in after topdress." });
    expect(lesson.status).toBe(201);
    expect(lesson.body.lesson.title).toBe("Application rate");

    const updatedLesson = await request(app)
      .patch(
        `/api/commercial/courses/${course.body.course.id}/lessons/${lesson.body.lesson.id}`
      )
      .send({ title: "Updated application rate", status: "published" });
    expect(updatedLesson.status).toBe(200);
    expect(updatedLesson.body.lesson).toMatchObject({
      id: lesson.body.lesson.id,
      title: "Updated application rate",
      status: "published"
    });

    const deletedLesson = await request(app).delete(
      `/api/commercial/courses/${course.body.course.id}/lessons/${lesson.body.lesson.id}`
    );
    expect(deletedLesson.status).toBe(200);
    expect(deletedLesson.body.deleted).toBe(true);

    const published = await request(app).post(
      `/api/commercial/courses/${course.body.course.id}/publish`
    );
    expect(published.status).toBe(200);
    expect(published.body.course).toMatchObject({
      status: "published",
      isPublished: true
    });
  });

  test("supports commercial inventory detail update adjustment and low-stock workflow", async () => {
    const created = await request(app).post("/api/commercial/inventory").send({
      name: "Kelp Meal",
      itemType: "ingredient",
      category: "dry_amendment",
      quantity: 8,
      unit: "lb",
      reorderPoint: 5,
      vendor: "Amendment Supplier",
      linkedProductId: "product-ready"
    });

    expect(created.status).toBe(201);
    const id = created.body.item.id;

    const detail = await request(app).get(`/api/commercial/inventory/${id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.item).toMatchObject({
      name: "Kelp Meal",
      itemType: "ingredient",
      linkedProductId: "product-ready"
    });

    const updated = await request(app).patch(`/api/commercial/inventory/${id}`).send({
      location: "Dry room shelf A",
      linkedGrowId: "grow-trial-1",
      notes: "Used for veg mix test batches"
    });

    expect(updated.status).toBe(200);
    expect(updated.body.item).toMatchObject({
      location: "Dry room shelf A",
      linkedGrowId: "grow-trial-1",
      notes: "Used for veg mix test batches"
    });

    const adjusted = await request(app).post("/api/commercial/inventory/adjust").send({
      itemId: id,
      delta: -4
    });

    expect(adjusted.status).toBe(200);
    expect(adjusted.body.item.quantity).toBe(4);

    const lowStock = await request(app).get("/api/commercial/inventory/low-stock");
    expect(lowStock.status).toBe(200);
    expect(lowStock.body.items.map((item) => item.id)).toContain(id);
  });

  test("retrieves and updates a commercial product detail record", async () => {
    const product = await request(app).post("/api/commercial/products").send({
      name: "Living Soil Base",
      status: "published",
      sku: "LSL-BASE",
      externalPurchaseUrl: "https://example.com/base"
    });

    const detail = await request(app).get(
      `/api/commercial/products/${product.body.product.id}`
    );
    expect(detail.status).toBe(200);
    expect(detail.body.product).toMatchObject({
      name: "Living Soil Base",
      status: "published",
      sku: "LSL-BASE"
    });

    const updated = await request(app)
      .patch(`/api/commercial/products/${product.body.product.id}`)
      .send({
        status: "draft",
        shortDescription: "Updated product copy.",
        externalPurchaseUrl: "https://example.com/new-base"
      });

    expect(updated.status).toBe(200);
    expect(updated.body.product).toMatchObject({
      status: "draft",
      shortDescription: "Updated product copy.",
      externalPurchaseUrl: "https://example.com/new-base"
    });
  });

  test("retrieves and updates a commercial grow detail record", async () => {
    const grow = await request(app).post("/api/commercial/grows").send({
      name: "Bloom Formula Trial",
      purpose: "product_trial",
      productId: "product-1",
      batchId: "batch-1",
      publicShareStatus: "evidence_building",
      status: "active"
    });

    const detail = await request(app).get(`/api/commercial/grows/${grow.body.grow.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.grow).toMatchObject({
      name: "Bloom Formula Trial",
      purpose: "product_trial",
      productId: "product-1",
      batchId: "batch-1"
    });

    const updated = await request(app)
      .patch(`/api/commercial/grows/${grow.body.grow.id}`)
      .send({
        status: "completed",
        publicShareStatus: "public_ready",
        notes: "Ready for public summary."
      });

    expect(updated.status).toBe(200);
    expect(updated.body.grow).toMatchObject({
      status: "completed",
      publicShareStatus: "public_ready",
      notes: "Ready for public summary."
    });
  });

  test("saves product trial AI review for commercial effectiveness workflow", async () => {
    const trial = await request(app).post("/api/commercial/trials").send({
      trialName: "Flower Formula Trial",
      status: "active",
      linkedProductId: "product-1"
    });

    const detail = await request(app).get(
      `/api/commercial/trials/${trial.body.trial.id}`
    );
    expect(detail.status).toBe(200);
    expect(detail.body.trial).toMatchObject({
      trialName: "Flower Formula Trial",
      status: "active"
    });

    const updated = await request(app)
      .patch(`/api/commercial/trials/${trial.body.trial.id}`)
      .send({
        status: "complete",
        effectivenessSummary: "Strong vigor with limited dry/cure data.",
        notes: "Use cautious public copy."
      });
    expect(updated.status).toBe(200);
    expect(updated.body.trial).toMatchObject({
      status: "complete",
      effectivenessSummary: "Strong vigor with limited dry/cure data.",
      notes: "Use cautious public copy."
    });

    const review = await request(app)
      .post(`/api/commercial/trials/${trial.body.trial.id}/ai-review`)
      .send({
        summary: "Strong vigor, limited dry/cure data.",
        evidence: ["vigor score increased"]
      });

    expect(review.status).toBe(200);
    expect(review.body.aiReview).toMatchObject({
      summary: "Strong vigor, limited dry/cure data.",
      evidence: ["vigor score increased"]
    });
    expect(review.body.trial.aiReview.summary).toBe(
      "Strong vigor, limited dry/cure data."
    );
  });

  test("creates commercial soil nutrient batches and links them to products", async () => {
    const product = await request(app).post("/api/commercial/products").send({
      name: "Bloom Topdress",
      status: "draft",
      productLineId: "line-1"
    });
    const batch = await request(app)
      .post("/api/commercial/batches")
      .send({
        name: "Bloom Topdress Batch 001",
        purpose: "bloom_support",
        formulaVersion: "v1.0",
        batchCode: "BT-001",
        productLineId: "line-1",
        guaranteedAnalysisEstimate: { N: 3, P2O5: 5, K2O: 4 },
        releaseTimeline: { fast: ["nitrogen"], slow: ["phosphorus"] }
      });

    expect(batch.status).toBe(201);
    expect(batch.body.batch).toMatchObject({
      name: "Bloom Topdress Batch 001",
      purpose: "bloom_support",
      formulaVersion: "v1.0"
    });

    const detail = await request(app).get(
      `/api/commercial/batches/${batch.body.batch.id}`
    );
    expect(detail.status).toBe(200);
    expect(detail.body.batch).toMatchObject({
      name: "Bloom Topdress Batch 001",
      purpose: "bloom_support",
      batchCode: "BT-001"
    });

    const updated = await request(app)
      .patch(`/api/commercial/batches/${batch.body.batch.id}`)
      .send({
        status: "ready",
        estimatedCost: 275,
        releaseTimelineNotes: "Fast nitrogen plus slow background nutrition",
        guaranteedAnalysisNotes: "3-5-4 label estimate"
      });
    expect(updated.status).toBe(200);
    expect(updated.body.batch).toMatchObject({
      status: "ready",
      estimatedCost: 275,
      releaseTimelineNotes: "Fast nitrogen plus slow background nutrition",
      guaranteedAnalysisNotes: "3-5-4 label estimate"
    });

    const linked = await request(app)
      .post(`/api/commercial/products/${product.body.product.id}/link-batch`)
      .send({ batchId: batch.body.batch.id, formulaVersion: "v1.0" });

    expect(linked.status).toBe(200);
    expect(linked.body.product.linkedBatchIds).toContain(batch.body.batch.id);
    expect(linked.body.batch).toMatchObject({
      linkedProductId: product.body.product.id,
      productName: "Bloom Topdress"
    });
  });

  test("builds product effectiveness summary from linked batches trials grows and courses", async () => {
    const product = await request(app).post("/api/commercial/products").send({
      name: "Seedling Soil",
      status: "published",
      productLineId: "line-1"
    });
    const batch = await request(app).post("/api/commercial/batches").send({
      name: "Seedling Soil Batch",
      productId: product.body.product.id,
      productLineId: "line-1",
      status: "ready"
    });
    const trial = await request(app)
      .post("/api/commercial/trials")
      .send({
        trialName: "Seedling Safety",
        productId: product.body.product.id,
        batchId: batch.body.batch.id,
        growId: "grow-1",
        status: "complete",
        harvestQualityNotes: "Dense flower, strong citrus fuel aroma, clean dry.",
        commercialCropSummary:
          "Seedling soil finished cleanly with strong final quality and no burn.",
        measurements: {
          vigorScores: [8, 9],
          pHChecks: [{ inputPH: 6.5, runoffPH: 6.7 }]
        }
      });
    await request(app).post("/api/commercial/grows").send({
      name: "Seedling Trial Grow",
      productId: product.body.product.id,
      batchId: batch.body.batch.id,
      status: "active"
    });
    await request(app).post("/api/commercial/courses").send({
      title: "Using Seedling Soil",
      linkedProductId: product.body.product.id,
      linkedProductLineId: "line-1",
      status: "published"
    });

    expect(trial.status).toBe(201);

    const summary = await request(app).get(
      `/api/commercial/products/${product.body.product.id}/effectiveness`
    );

    expect(summary.status).toBe(200);
    expect(summary.body.summary).toMatchObject({
      batchCount: 1,
      completedTrialCount: 1,
      growCount: 1,
      courseCount: 1,
      measurementCount: 1,
      harvestQualityCount: 1,
      commercialCropSummaryCount: 1,
      latestHarvestQualityNotes: "Dense flower, strong citrus fuel aroma, clean dry.",
      latestCommercialCropSummary:
        "Seedling soil finished cleanly with strong final quality and no burn.",
      publicProofReady: true
    });
    expect(summary.body.linked.batches[0].name).toBe("Seedling Soil Batch");
    expect(summary.body.linked.trials[0].trialName).toBe("Seedling Safety");
    expect(summary.body.summary.warnings).toEqual([]);
  });

  test("runs commercial tomato live pack through product trial crop summary workflow", async () => {
    const pack = livePack("commercial");
    const weekZero = liveWeek(pack, 0);
    const weekTen = liveWeek(pack, 10);
    const weekTwelve = liveWeek(pack, 12);
    const weekFifteen = liveWeek(pack, 15);

    const line = await request(app).post("/api/commercial/product-lines").send({
      name: "Outdoor Tomato Trial Line",
      category: "garden_center",
      status: "testing",
      publicSummary: "Sunviva and Primabella outdoor crop trial line."
    });
    expect(line.status).toBe(201);

    const product = await request(app).post("/api/commercial/products").send({
      name: "Sunviva / Primabella Trial Pack",
      category: "plant",
      status: "published",
      productLineId: line.body.productLine.id,
      shortDescription: "Outdoor tomato cultivar comparison with soil input notes.",
      usageInstructions: "Use saved grow trial evidence before making public claims."
    });
    expect(product.status).toBe(201);

    const batch = await request(app)
      .post("/api/commercial/batches")
      .send({
        name: "Outdoor Tomato Soil/Input Trial Batch",
        purpose: "commercial_crop_trial",
        status: "ready",
        productId: product.body.product.id,
        productLineId: line.body.productLine.id,
        ingredientSummary: `Soil options: ${weekTen.soilOptions.join(" vs ")}`,
        mixingInstructions: "Track soil lot and input performance by cultivar."
      });
    expect(batch.status).toBe(201);

    const grow = await request(app)
      .post("/api/commercial/grows")
      .send({
        name: pack.realGrowData.normalizedRecords.grow.name,
        purpose: pack.realGrowData.normalizedRecords.grow.purpose,
        cropType: pack.workflow.cropType,
        cultivar: pack.workflow.cultivars.join(" / "),
        plantCount: weekFifteen.recoveryStatus.plantCount,
        productId: product.body.product.id,
        productLineId: line.body.productLine.id,
        batchId: batch.body.batch.id,
        measurementPlan: pack.realGrowData.normalizedRecords.cropTrial.measurementPlan,
        publicShareStatus: "evidence_building",
        status: "active"
      });
    expect(grow.status).toBe(201);

    const cropSummary = [
      "Sunviva / Primabella outdoor tomato crop trial.",
      `${weekZero.cultivarGermination[0].cultivar} germinated ${weekZero.cultivarGermination[0].germinated}/${weekZero.cultivarGermination[0].started}.`,
      `${weekZero.cultivarGermination[1].cultivar} germinated ${weekZero.cultivarGermination[1].germinated}/${weekZero.cultivarGermination[1].started}.`,
      `${weekTwelve.soilPerformanceComparison.currentLeader} outperformed ${weekTwelve.soilPerformanceComparison.laggingSoil}.`,
      weekFifteen.recoveryStatus.notes
    ].join(" ");
    const harvestQualityNotes = `Harvest notes: ${weekFifteen.harvest.notes} Flavor: ${weekFifteen.flavorNotes.join(", ")}.`;

    const updatedGrow = await request(app)
      .patch(`/api/commercial/grows/${grow.body.grow.id}`)
      .send({
        status: "completed",
        publicShareStatus: "public_ready",
        harvestQualityNotes,
        commercialCropSummary: cropSummary
      });
    expect(updatedGrow.status).toBe(200);
    expect(updatedGrow.body.grow).toMatchObject({
      status: "completed",
      publicShareStatus: "public_ready",
      harvestQualityNotes,
      commercialCropSummary: cropSummary
    });

    const trial = await request(app)
      .post("/api/commercial/trials")
      .send({
        trialName: pack.realGrowData.normalizedRecords.cropTrial.trialName,
        purpose: pack.realGrowData.normalizedRecords.cropTrial.purpose,
        productId: product.body.product.id,
        productLineId: line.body.productLine.id,
        batchId: batch.body.batch.id,
        growId: grow.body.grow.id,
        cropType: pack.workflow.cropType,
        cultivar: pack.workflow.cultivars.join(" / "),
        plantCount: weekFifteen.recoveryStatus.plantCount,
        measurements: {
          germination: weekZero.cultivarGermination,
          finalPots: weekTen.finalPots,
          soilOptions: weekTen.soilOptions,
          soilPerformanceComparison: weekTwelve.soilPerformanceComparison,
          supplierContact: weekTwelve.supplierContact,
          harvest: weekFifteen.harvest,
          recoveryStatus: weekFifteen.recoveryStatus,
          flavorNotes: weekFifteen.flavorNotes
        },
        effectivenessSummary:
          "Cultivar and soil/input trial produced recoverable plants with documented soil performance differences.",
        harvestQualityNotes,
        commercialCropSummary: cropSummary,
        status: "complete"
      });

    expect(trial.status).toBe(201);
    expect(trial.body.trial.measurements).toMatchObject({
      soilOptions: ["Sonnerde", "Neudorff"],
      supplierContact: {
        supplier: "Neudorff",
        contacted: true
      },
      recoveryStatus: {
        allRecovered: true
      },
      flavorNotes: ["sweet", "aromatic"]
    });

    const summary = await request(app).get(
      `/api/commercial/products/${product.body.product.id}/effectiveness`
    );

    expect(summary.status).toBe(200);
    expect(summary.body.summary).toMatchObject({
      batchCount: 1,
      completedTrialCount: 1,
      growCount: 1,
      harvestQualityCount: 1,
      commercialCropSummaryCount: 1,
      latestHarvestQualityNotes: harvestQualityNotes,
      latestCommercialCropSummary: cropSummary,
      publicProofReady: true
    });
    expect(summary.body.linked.trials[0].measurements).toMatchObject({
      soilPerformanceComparison: {
        currentLeader: "Sonnerde",
        laggingSoil: "Neudorff"
      },
      flavorNotes: ["sweet", "aromatic"]
    });

    const review = await request(app).post(
      `/api/commercial/trials/${trial.body.trial.id}/ai-review`
    );

    expect(review.status).toBe(200);
    expect(review.body.aiReview.summary).toBe(cropSummary);
    expect(review.body.aiReview.evidence).toEqual(
      expect.arrayContaining([
        "Effectiveness: Cultivar and soil/input trial produced recoverable plants with documented soil performance differences.",
        `Harvest quality: ${harvestQualityNotes}`,
        `Crop summary: ${cropSummary}`
      ])
    );
  });

  test("effectiveness summary warns when product lacks batch and completed trials", async () => {
    const product = await request(app).post("/api/commercial/products").send({
      name: "Untested Mix",
      status: "draft"
    });

    const summary = await request(app).get(
      `/api/commercial/products/${product.body.product.id}/effectiveness`
    );

    expect(summary.status).toBe(200);
    expect(summary.body.summary.publicProofReady).toBe(false);
    expect(summary.body.summary.warnings).toEqual(
      expect.arrayContaining([
        "No linked batch/formula record is saved for this product.",
        "No product trials are linked to this product.",
        "No completed trial is available for publishable effectiveness claims."
      ])
    );
  });

  test("product trial AI review defaults include harvest quality and crop summary evidence", async () => {
    const trial = await request(app).post("/api/commercial/trials").send({
      trialName: "Bloom Quality Trial",
      status: "complete",
      effectivenessSummary: "Improved flower structure against the control.",
      harvestQualityNotes: "Loud citrus aroma, clean dry, dense tops.",
      commercialCropSummary: "Commercial crop summary is ready for cautious proof."
    });

    const review = await request(app).post(
      `/api/commercial/trials/${trial.body.trial.id}/ai-review`
    );

    expect(review.status).toBe(200);
    expect(review.body.aiReview.summary).toBe(
      "Commercial crop summary is ready for cautious proof."
    );
    expect(review.body.aiReview.evidence).toEqual(
      expect.arrayContaining([
        "Effectiveness: Improved flower structure against the control.",
        "Harvest quality: Loud citrus aroma, clean dry, dense tops.",
        "Crop summary: Commercial crop summary is ready for cautious proof."
      ])
    );
  });

  test("keeps private commercial products scoped by owner", async () => {
    rows.push({
      _id: "other-product",
      userId: "other-user",
      recordType: "product",
      name: "Other Product",
      status: "draft",
      payload: { name: "Other Product" },
      deletedAt: null
    });

    const res = await request(app).get("/api/commercial/products");

    expect(res.status).toBe(200);
    expect(res.body.products).toEqual([]);
  });
});
