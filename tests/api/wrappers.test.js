import * as usersApi from "../../src/api/users.js";
import * as coursesApi from "../../src/api/courses.js";
import * as coursePaymentsApi from "../../src/api/coursePayments";
import * as forumApi from "../../src/api/forum.js";
import * as tasksApi from "../../src/api/tasks.js";
import * as environmentApi from "../../src/api/environment.js";
import * as creatorApi from "../../src/api/creator.js";
import * as subscriptionApi from "../../src/api/subscription.js";
import * as guildsApi from "../../src/api/guilds.js";
import * as livesApi from "../../src/api/lives.js";
import * as plantsApi from "../../src/api/plants.js";
import * as growlogApi from "../../src/api/growlog.js";
import * as growsApi from "../../src/api/grows.js";
import * as tokensApi from "../../src/api/tokens.js";
import * as reportsApi from "../../src/api/reports.js";
import * as earningsApi from "../../src/api/earnings.js";
import * as certificatesApi from "../../src/api/certificates.js";
import * as campaignsApi from "../../src/api/campaigns";
import * as linksApi from "../../src/api/links.js";
import * as ordersApi from "../../src/api/orders";
import * as productsApi from "../../src/api/products";
import * as storefrontApi from "../../src/api/storefront";
import * as commercialAnalyticsApi from "../../src/api/commercialAnalytics";
import * as commercialWorkflowsApi from "../../src/api/commercialWorkflows";
import * as marketplaceApi from "../../src/api/marketplace.js";
import ROUTES from "../../src/api/routes.js";

// Setup minimal fetch spy
let fetchCalls = [];
global.fetch = async (url, options) => {
  fetchCalls.push({ url, options });
  return {
    ok: true,
    text: async () =>
      JSON.stringify({ success: true, token: "success-token", user: { id: "u1" } }),
    json: async () => ({ success: true, token: "success-token", user: { id: "u1" } })
  };
};

global.API_URL_OVERRIDE = "http://test-api.local";
global.authToken = "unit-test-token";

if (typeof FormData === "undefined") {
  global.FormData = class FormData {
    constructor() {
      this.data = [];
    }
    append(k, v) {
      this.data.push([k, v]);
    }
  };
}

describe("API Wrappers Unit Tests", () => {
  beforeEach(() => {
    fetchCalls = [];
  });

  it("Environment API: uses the mounted rule-review endpoint", async () => {
    await environmentApi.analyzeEnvironment({
      stage: "veg",
      tempDayC: 25,
      humidity: 60
    });
    expect(fetchCalls[0].options.method).toBe("POST");
    expect(fetchCalls[0].url.endsWith("/api/tools/environment-analysis")).toBe(true);
  });

  it("Users API: followUser uses POST and correct path", async () => {
    await usersApi.followUser("u1");
    expect(fetchCalls[0].options.method).toBe("POST");
    expect(fetchCalls[0].url.endsWith(ROUTES.USER.FOLLOW("u1"))).toBe(true);
  });

  it("Users API: updateBio uses POST and correct path", async () => {
    await usersApi.updateBio("New bio");
    expect(fetchCalls[0].options.method).toBe("POST");
    expect(fetchCalls[0].url.endsWith(ROUTES.USER.BIO)).toBe(true);
    expect(JSON.parse(fetchCalls[0].options.body).bio).toBe("New bio");
  });

  it("Creator payout APIs use provider-backed status and Dashboard endpoints", async () => {
    await creatorApi.getConnectPayoutStatus();
    expect(fetchCalls[0].options.method).toBe("GET");
    expect(fetchCalls[0].url.endsWith(ROUTES.CREATOR.CONNECT_PAYOUT_STATUS)).toBe(true);

    await creatorApi.createConnectPayoutDashboardLink();
    expect(fetchCalls[1].options.method).toBe("POST");
    expect(fetchCalls[1].url.endsWith(ROUTES.CREATOR.CONNECT_PAYOUT_DASHBOARD)).toBe(
      true
    );
  });

  it("Earnings payout APIs never call the retired local request route", async () => {
    await earningsApi.getConnectPayoutStatus();
    await earningsApi.createConnectPayoutDashboardLink();

    expect(fetchCalls[0].url.endsWith("/api/earnings/connect-status")).toBe(true);
    expect(fetchCalls[1].url.endsWith("/api/earnings/connect-dashboard-link")).toBe(true);
    expect(fetchCalls.some(({ url }) => url.endsWith("/request-payout"))).toBe(false);
  });

  it("Reports API: sends authenticated exact-content context to the moderation endpoint", async () => {
    await reportsApi.submitReport({
      contentType: "video",
      contentId: "video-1",
      contentTitle: "Living soil walkthrough",
      targetUrl: "/videos/video-1",
      reason: "Misleading claim"
    });

    expect(fetchCalls[0].options.method).toBe("POST");
    expect(fetchCalls[0].url.endsWith(ROUTES.REPORTS.SUBMIT)).toBe(true);
    expect(JSON.parse(fetchCalls[0].options.body)).toEqual({
      contentType: "video",
      contentId: "video-1",
      contentTitle: "Living soil walkthrough",
      targetUrl: "/videos/video-1",
      reason: "Misleading claim"
    });
  });

  it("Courses API: enrollInCourse uses POST", async () => {
    await coursesApi.enrollInCourse("c1");
    expect(fetchCalls[0].options.method).toBe("POST");
    expect(fetchCalls[0].url.endsWith(ROUTES.COURSES.ENROLL("c1"))).toBe(true);
  });

  it("Courses API: buyCourse starts checkout via POST", async () => {
    await coursesApi.buyCourse("c1");
    expect(fetchCalls[0].options.method).toBe("POST");
    expect(fetchCalls[0].url.endsWith(ROUTES.PAYMENTS.CHECKOUT("c1"))).toBe(true);
  });

  it("Subscription API: createCheckoutSession starts Stripe checkout via POST", async () => {
    const previousWindow = global.window;
    global.window = { location: { origin: "https://app.example" } };

    try {
      await subscriptionApi.createCheckoutSession({
        plan: "commercial",
        interval: "yearly"
      });
      expect(fetchCalls[0].options.method).toBe("POST");
      expect(fetchCalls[0].url.endsWith(ROUTES.SUBSCRIBE.CREATE_CHECKOUT_SESSION)).toBe(
        true
      );
      expect(JSON.parse(fetchCalls[0].options.body)).toEqual({
        plan: "commercial",
        interval: "yearly",
        successUrl: "https://app.example/offers?subscription=success",
        cancelUrl: "https://app.example/offers?subscription=canceled"
      });
    } finally {
      global.window = previousWindow;
    }
  });

  it("Subscription API: createCheckoutSession forwards gift metadata but never client return URLs", async () => {
    const previousWindow = global.window;
    global.window = { location: { origin: "https://app.example" } };

    try {
      await subscriptionApi.createCheckoutSession({
        plan: "pro",
        interval: "monthly",
        giftMode: true,
        giftRecipientEmail: "Friend@Example.com",
        giftRecipientName: "Friend Name",
        giftMessage: "Happy growing!",
        checkoutAttemptId: "a2d70c6e-6f0e-4a21-9bb7-d611bf55ee55",
        giftQuoteToken: "1.payload.signature",
        successUrl: "https://app.example/home/personal/upgrade?gift=success",
        cancelUrl: "https://app.example/home/personal/upgrade?gift=canceled"
      });
      expect(fetchCalls[0].options.method).toBe("POST");
      expect(JSON.parse(fetchCalls[0].options.body)).toEqual({
        plan: "pro",
        interval: "monthly",
        giftMode: true,
        giftRecipientEmail: "friend@example.com",
        giftRecipientName: "Friend Name",
        giftMessage: "Happy growing!",
        checkoutAttemptId: "a2d70c6e-6f0e-4a21-9bb7-d611bf55ee55",
        giftQuoteToken: "1.payload.signature"
      });
    } finally {
      global.window = previousWindow;
    }
  });

  it("Subscription API: does not send a gift attempt id for a non-gift checkout", async () => {
    await subscriptionApi.createCheckoutSession({
      plan: "pro",
      interval: "monthly",
      checkoutAttemptId: "f5f8cf6b-0a09-4438-83de-b513bd60e559"
    });

    expect(JSON.parse(fetchCalls[0].options.body)).not.toHaveProperty(
      "checkoutAttemptId"
    );
  });

  it("Subscription API: previews a gift with an unauthenticated POST body", async () => {
    await subscriptionApi.getGiftClaim("gift-token-123");

    expect(fetchCalls[0].url.endsWith("/api/subscription/gifts/claim/preview")).toBe(
      true
    );
    expect(fetchCalls[0].options.method).toBe("POST");
    expect(JSON.parse(fetchCalls[0].options.body)).toEqual({ token: "gift-token-123" });
    expect(fetchCalls[0].options.headers.Authorization).toBeUndefined();
    expect(fetchCalls[0].options.cache).toBe("no-store");
  });

  it("Subscription API: createCheckoutSession defaults legacy callers to pro monthly", async () => {
    const previousWindow = global.window;
    global.window = { location: { origin: "https://app.example" } };

    try {
      await subscriptionApi.createCheckoutSession();
      expect(fetchCalls[0].options.method).toBe("POST");
      expect(JSON.parse(fetchCalls[0].options.body)).toEqual({
        plan: "pro",
        interval: "monthly",
        successUrl: "https://app.example/offers?subscription=success",
        cancelUrl: "https://app.example/offers?subscription=canceled"
      });
    } finally {
      global.window = previousWindow;
    }
  });

  it("Course payments API: startCourseCheckout uses canonical Stripe checkout", async () => {
    await coursePaymentsApi.startCourseCheckout("course 1");
    expect(fetchCalls[0].options.method).toBe("POST");
    expect(fetchCalls[0].url.endsWith(ROUTES.PAYMENTS.CHECKOUT("course 1"))).toBe(true);
  });

  it("Course payments API: startCourseCheckout can return to a public storefront course page", async () => {
    const previousWindow = global.window;
    global.window = { location: { origin: "https://app.example" } };

    try {
      await coursePaymentsApi.startCourseCheckout("course 1", {
        returnPath: "/store/living-soil/courses/course%201"
      });
    } finally {
      global.window = previousWindow;
    }

    const body = JSON.parse(fetchCalls[0].options.body);
    expect(body.successUrl).toBe(
      "https://app.example/store/living-soil/courses/course%201?checkout=success&courseId=course%201&course=course%201"
    );
    expect(body.cancelUrl).toBe(
      "https://app.example/store/living-soil/courses/course%201?checkout=canceled&courseId=course%201&course=course%201"
    );
  });

  it("Course payments API: requires authoritative enrollment before confirmation", () => {
    expect(
      coursePaymentsApi.coursePaymentReconciliationState({
        enrolled: false,
        paymentStatus: "paid",
        checkoutStatus: "recorded"
      })
    ).toBe("pending");
    expect(
      coursePaymentsApi.coursePaymentReconciliationState({
        paymentStatus: "paid",
        checkoutStatus: "recorded"
      })
    ).toBe("pending");
    expect(
      coursePaymentsApi.coursePaymentReconciliationState({
        enrolled: true,
        paymentStatus: "paid"
      })
    ).toBe("confirmed");
    expect(
      coursePaymentsApi.coursePaymentReconciliationState({
        enrolled: true,
        refundStatus: "refunded"
      })
    ).toBe("terminal");
  });

  it("Marketplace API: purchaseContent starts marketplace checkout", async () => {
    await marketplaceApi.purchaseContent("content 1");
    expect(fetchCalls[0].options.method).toBe("POST");
    expect(fetchCalls[0].url.endsWith("/api/marketplace/content%201/purchase")).toBe(
      true
    );
  });

  it("Commercial API: checkoutProduct starts storefront product checkout", async () => {
    await productsApi.checkoutProduct("product 1");
    expect(fetchCalls[0].options.method).toBe("POST");
    expect(
      fetchCalls[0].url.endsWith("/api/commercial/products/product%201/checkout")
    ).toBe(true);
  });

  it("Marketplace API: purchaseContent supplies recoverable buyer return URLs", async () => {
    const previousWindow = global.window;
    global.window = { location: { origin: "https://app.example" } };

    try {
      await marketplaceApi.purchaseContent("content 1", {
        returnPath: "/marketplace"
      });
    } finally {
      global.window = previousWindow;
    }

    expect(JSON.parse(fetchCalls[0].options.body)).toEqual({
      successUrl:
        "https://app.example/marketplace?checkout=success&contentId=content%201",
      cancelUrl: "https://app.example/marketplace?checkout=canceled&contentId=content%201"
    });
  });

  it("Commercial API: checkoutProduct can return to a public product page", async () => {
    const previousWindow = global.window;
    global.window = { location: { origin: "https://app.example" } };

    try {
      await productsApi.checkoutProduct("product 1", {
        returnPath: "/store/living-soil/products/product%201"
      });
    } finally {
      global.window = previousWindow;
    }

    const body = JSON.parse(fetchCalls[0].options.body);
    expect(body.successUrl).toBe(
      "https://app.example/store/living-soil/products/product%201?checkout=success&product=product%201"
    );
    expect(body.cancelUrl).toBe(
      "https://app.example/store/living-soil/products/product%201?checkout=canceled&product=product%201"
    );
  });

  it("Subscription API: verifyIapReceipt posts platform receipt to backend", async () => {
    await subscriptionApi.verifyIapReceipt({
      receipt: "receipt-1",
      platform: "ios",
      productId: "pro-monthly",
      transactionId: "txn-1"
    });

    expect(fetchCalls[0].options.method).toBe("POST");
    expect(fetchCalls[0].url.endsWith(ROUTES.SUBSCRIBE.VERIFY_IAP)).toBe(true);
    expect(JSON.parse(fetchCalls[0].options.body)).toEqual({
      receipt: "receipt-1",
      platform: "ios",
      productId: "pro-monthly",
      transactionId: "txn-1"
    });
  });

  it("Commercial API: storefront uses canonical commercial endpoints", async () => {
    await storefrontApi.fetchStorefront();
    expect(fetchCalls[0].url.endsWith("/api/commercial/storefront")).toBe(true);

    await storefrontApi.updateStorefront({ name: "Shop" });
    expect(fetchCalls[1].options.method).toBe("PATCH");
    expect(fetchCalls[1].url.endsWith("/api/commercial/storefront")).toBe(true);
  });

  it("Commercial API: public storefront fetch uses slug endpoint", async () => {
    await storefrontApi.fetchPublicStorefront("seller store");
    expect(fetchCalls[0].options.method).toBe("GET");
    expect(
      fetchCalls[0].url.endsWith("/api/commercial/storefront/public/seller%20store")
    ).toBe(true);
  });

  it("Commercial API: public storefront search supports query and similarity", async () => {
    await storefrontApi.searchPublicStorefronts({
      q: "soil",
      similarTo: "seller store",
      limit: 12
    });
    expect(fetchCalls[0].options.method).toBe("GET");
    expect(
      fetchCalls[0].url.endsWith(
        "/api/commercial/storefront/public?q=soil&similarTo=seller+store&limit=12"
      )
    ).toBe(true);
  });

  it("Commercial API: public dispensary search supports state and distance", async () => {
    await storefrontApi.searchPublicStorefronts({
      storefrontType: "dispensary",
      stateCode: "MA",
      latitude: 42.3601,
      longitude: -71.0589,
      radiusMiles: 25,
      limit: 25
    });
    expect(fetchCalls[0].options.method).toBe("GET");
    expect(
      fetchCalls[0].url.endsWith(
        "/api/commercial/storefront/public?storefrontType=dispensary&state=MA&latitude=42.3601&longitude=-71.0589&radiusMiles=25&limit=25"
      )
    ).toBe(true);
  });

  it("Commercial API: products use canonical commercial endpoints", async () => {
    await productsApi.fetchProducts();
    expect(fetchCalls[0].url.endsWith("/api/commercial/products")).toBe(true);

    await productsApi.updateProduct("p 1", { name: "Product" });
    expect(fetchCalls[1].options.method).toBe("PATCH");
    expect(fetchCalls[1].url.endsWith("/api/commercial/products/p%201")).toBe(true);

    await productsApi.createProduct({
      name: "Linked Product",
      inventoryItemId: "inv 1",
      inventoryCount: null
    });
    expect(fetchCalls[2].options.method).toBe("POST");
    expect(fetchCalls[2].url.endsWith("/api/commercial/products")).toBe(true);
    expect(JSON.parse(fetchCalls[2].options.body)).toEqual({
      name: "Linked Product",
      inventoryItemId: "inv 1",
      inventoryCount: null
    });
  });

  it("Commercial API: links campaigns and orders use canonical endpoints", async () => {
    await linksApi.fetchLinks();
    await campaignsApi.fetchCampaigns();
    await campaignsApi.createCampaign({
      name: "Product Drop",
      linkedProductId: "product 1"
    });
    await ordersApi.fetchOrders();
    await ordersApi.updateOrderFulfillment("order 1", "fulfilled");
    await linksApi.updateLink("link 1", { label: "Updated" });
    await campaignsApi.updateCampaign("campaign 1", { status: "active" });
    await campaignsApi.recordCampaignClick("campaign 1", {
      targetUrl: "https://example.com",
      source: "feed"
    });

    expect(fetchCalls[0].url.endsWith("/api/commercial/links")).toBe(true);
    expect(fetchCalls[1].url.endsWith("/api/commercial/campaigns")).toBe(true);
    expect(fetchCalls[2].options.method).toBe("POST");
    expect(fetchCalls[2].url.endsWith("/api/commercial/campaigns")).toBe(true);
    expect(JSON.parse(fetchCalls[2].options.body)).toMatchObject({
      name: "Product Drop",
      linkedProductId: "product 1"
    });
    expect(fetchCalls[3].url.endsWith("/api/commercial/orders")).toBe(true);
    expect(fetchCalls[4].options.method).toBe("PATCH");
    expect(fetchCalls[4].url.endsWith("/api/commercial/orders/order%201")).toBe(true);
    expect(JSON.parse(fetchCalls[4].options.body)).toEqual({
      fulfillmentStatus: "fulfilled"
    });
    expect(fetchCalls[5].options.method).toBe("PATCH");
    expect(fetchCalls[5].url.endsWith("/api/commercial/links/link%201")).toBe(true);
    expect(fetchCalls[6].options.method).toBe("PATCH");
    expect(fetchCalls[6].url.endsWith("/api/commercial/campaigns/campaign%201")).toBe(
      true
    );
    expect(fetchCalls[7].options.method).toBe("POST");
    expect(
      fetchCalls[7].url.endsWith("/api/commercial/campaigns/campaign%201/click")
    ).toBe(true);
    expect(JSON.parse(fetchCalls[7].options.body)).toMatchObject({
      targetUrl: "https://example.com",
      source: "feed"
    });
  });

  it("Commercial API: product lines and trials use canonical workflow endpoints", async () => {
    await commercialWorkflowsApi.fetchProductLines();
    await commercialWorkflowsApi.createProductLine({
      name: "Living Soil Line",
      status: "draft"
    });
    await commercialWorkflowsApi.updateProductLine("line 1", {
      publicSummary: "Updated"
    });
    await commercialWorkflowsApi.fetchProductTrials();
    await commercialWorkflowsApi.createProductTrial({
      trialName: "Seedling Safety",
      status: "planned"
    });
    await commercialWorkflowsApi.updateProductTrial("trial 1", {
      status: "active"
    });
    await commercialWorkflowsApi.fetchProductTrialEvidenceRuns();
    await commercialWorkflowsApi.createProductTrialEvidenceRun({
      name: "Bloom Trial",
      status: "active"
    });
    await commercialWorkflowsApi.updateProductTrialEvidenceRun("grow 1", {
      publicShareStatus: "public_ready"
    });
    await commercialWorkflowsApi.fetchSoilNutrientBatches();
    await commercialWorkflowsApi.createSoilNutrientBatch({
      batchName: "Bloom Batch",
      status: "planned"
    });
    await commercialWorkflowsApi.updateSoilNutrientBatch("batch 1", {
      status: "ready"
    });
    await commercialWorkflowsApi.fetchCommercialCourses();
    await commercialWorkflowsApi.createCommercialCourse({
      title: "Bloom Topdress Training",
      status: "draft"
    });
    await commercialWorkflowsApi.updateCommercialCourse("course 1", {
      status: "published"
    });

    expect(fetchCalls[0].url.endsWith("/api/commercial/product-lines")).toBe(true);
    expect(fetchCalls[1].options.method).toBe("POST");
    expect(fetchCalls[1].url.endsWith("/api/commercial/product-lines")).toBe(true);
    expect(JSON.parse(fetchCalls[1].options.body)).toMatchObject({
      name: "Living Soil Line",
      status: "draft"
    });
    expect(fetchCalls[2].options.method).toBe("PATCH");
    expect(fetchCalls[2].url.endsWith("/api/commercial/product-lines/line%201")).toBe(
      true
    );
    expect(fetchCalls[3].url.endsWith("/api/commercial/trials")).toBe(true);
    expect(fetchCalls[4].options.method).toBe("POST");
    expect(fetchCalls[4].url.endsWith("/api/commercial/trials")).toBe(true);
    expect(JSON.parse(fetchCalls[4].options.body)).toMatchObject({
      trialName: "Seedling Safety",
      status: "planned"
    });
    expect(fetchCalls[5].options.method).toBe("PATCH");
    expect(fetchCalls[5].url.endsWith("/api/commercial/trials/trial%201")).toBe(true);
    expect(fetchCalls[6].url.endsWith("/api/commercial/grows")).toBe(true);
    expect(fetchCalls[7].options.method).toBe("POST");
    expect(fetchCalls[7].url.endsWith("/api/commercial/grows")).toBe(true);
    expect(JSON.parse(fetchCalls[7].options.body)).toMatchObject({
      name: "Bloom Trial",
      status: "active"
    });
    expect(fetchCalls[8].options.method).toBe("PATCH");
    expect(fetchCalls[8].url.endsWith("/api/commercial/grows/grow%201")).toBe(true);
    expect(fetchCalls[9].url.endsWith("/api/commercial/batches")).toBe(true);
    expect(fetchCalls[10].options.method).toBe("POST");
    expect(fetchCalls[10].url.endsWith("/api/commercial/batches")).toBe(true);
    expect(JSON.parse(fetchCalls[10].options.body)).toMatchObject({
      batchName: "Bloom Batch",
      status: "planned"
    });
    expect(fetchCalls[11].options.method).toBe("PATCH");
    expect(fetchCalls[11].url.endsWith("/api/commercial/batches/batch%201")).toBe(true);
    expect(fetchCalls[12].url.endsWith("/api/commercial/courses")).toBe(true);
    expect(fetchCalls[13].options.method).toBe("POST");
    expect(fetchCalls[13].url.endsWith("/api/commercial/courses")).toBe(true);
    expect(JSON.parse(fetchCalls[13].options.body)).toMatchObject({
      title: "Bloom Topdress Training",
      status: "draft"
    });
    expect(fetchCalls[14].options.method).toBe("PATCH");
    expect(fetchCalls[14].url.endsWith("/api/commercial/courses/course%201")).toBe(true);
  });

  it("Commercial API: analytics overview uses canonical endpoint", async () => {
    await commercialAnalyticsApi.fetchCommercialAnalyticsOverview();
    expect(fetchCalls[0].url.endsWith("/api/commercial/analytics/overview")).toBe(true);
  });

  it("Commercial API: analytics event tracking posts public click events", async () => {
    await commercialAnalyticsApi.recordCommercialAnalyticsEvent({
      eventType: "product_external_link_click",
      objectType: "product",
      objectId: "product 1",
      storefrontSlug: "soil-brand",
      targetUrl: "https://example.com"
    });

    expect(fetchCalls[0].options.method).toBe("POST");
    expect(fetchCalls[0].url.endsWith("/api/commercial/analytics/events")).toBe(true);
    expect(JSON.parse(fetchCalls[0].options.body)).toMatchObject({
      eventType: "product_external_link_click",
      objectId: "product 1",
      storefrontSlug: "soil-brand"
    });
  });

  it("Forum API: createPost uses POST", async () => {
    await forumApi.createPost({ title: "Test" });
    expect(fetchCalls[0].options.method).toBe("POST");
    expect(fetchCalls[0].url.endsWith(ROUTES.FORUM.CREATE)).toBe(true);
  });

  // ... Add more tests as needed, following the above pattern ...
});
