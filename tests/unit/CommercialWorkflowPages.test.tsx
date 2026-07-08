import React from "react";
import fs from "fs";
import path from "path";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CommercialHome from "@/app/home/commercial";
import CommercialCommunityRoute from "@/app/home/commercial/community";
import CommercialCoursesRoute from "@/app/home/commercial/courses";
import CommercialCourseDetailRoute from "@/app/home/commercial/courses/[courseId]";
import CommercialMarketingRoute from "@/app/home/commercial/marketing";
import CommercialOrdersRoute from "@/app/home/commercial/orders";
import CommercialProductLinesRoute from "@/app/home/commercial/product-lines";
import CommercialProductLineDetailRoute from "@/app/home/commercial/product-lines/[lineId]";
import CommercialProductsRoute from "@/app/home/commercial/products";
import CommercialProductDetailRoute from "@/app/home/commercial/products/[productId]";
import NewCommercialProductRoute from "@/app/home/commercial/products/new";
import CommercialBatchPlannerRoute from "@/app/home/commercial/batch-planner";
import CommercialBatchDetailRoute from "@/app/home/commercial/batch-planner/[batchId]";
import CommercialAnalyticsRoute from "@/app/home/commercial/analytics";
import CommercialGrowsRoute from "@/app/home/commercial/grows";
import CommercialGrowDetailRoute from "@/app/home/commercial/grows/[growId]";
import NewCommercialGrowRoute from "@/app/home/commercial/grows/new";
import CommercialTrialsRoute from "@/app/home/commercial/trials";
import CommercialTrialDetailRoute from "@/app/home/commercial/trials/[trialId]";
import CommercialInventoryItemDetailRoute from "@/app/home/commercial/inventory-item/[id]";

const mockApiRequest = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock("expo-router", () => {
  const React = require("react");
  const mockRouter = { replace: mockReplace, push: mockPush, back: mockBack };
  return {
    Link: ({ children, href }: any) =>
      React.cloneElement(React.Children.only(children), { href }),
    Redirect: ({ href }: any) => React.createElement("Redirect", { href }),
    useLocalSearchParams: () => ({
      growId: "grow-1",
      batchId: "batch-1",
      courseId: "course-1",
      lineId: "line-1",
      productId: "product-1",
      trialId: "trial-1",
      id: "inventory-1"
    }),
    useRouter: () => mockRouter
  };
});

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: { email: "brand@example.com" }, logout: jest.fn() })
}));

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/components/InlineError", () => ({
  InlineError: () => null
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { COMMERCIAL_INVENTORY_WRITE: "commercial_inventory_write" },
  useEntitlements: () => ({
    ready: true,
    plan: "commercial",
    mode: "commercial",
    can: () => true
  })
}));

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children, header }: any) => React.createElement(View, null, header, children);
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children }: any) => React.createElement(View, null, children);
});

describe("commercial workflow pages", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockReplace.mockReset();
    mockPush.mockReset();
    mockBack.mockReset();
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/commercial/dashboard") {
        return Promise.resolve({
          dashboard: {
            storefront: { name: "Living Soil Labs", slug: "living-soil-labs" },
            counts: {
              activeTrials: 3,
              completedTrials: 2,
              productsMissingCompletedTrials: 1,
              batches: 4,
              productLines: 2,
              products: 5,
              productsMissingBatches: 1,
              storefrontViews: 88,
              inventory: 9,
              lowStock: 2,
              externalLeads: 6,
              orders: 7,
              draftPosts: 1,
              draftCourses: 2,
              courses: 4,
              posts: 3,
              adClicks: 42,
              externalClicks: 19,
              productViews: 75
            },
            actionItems: [
              {
                type: "product_missing_batch",
                title: "Bloom Topdress",
                priority: "medium",
                productId: "product-1"
              }
            ],
            guidance: [
              "Products need linked formulas/batches before strong public claims."
            ]
          }
        });
      }
      if (path === "/api/commercial/product-lines" && !options) {
        return Promise.resolve({
          productLines: [
            {
              id: "line-1",
              name: "Living Soil Line",
              category: "soil",
              status: "draft",
              publicSummary: "Purpose-built soil products"
            }
          ]
        });
      }
      if (path === "/api/commercial/product-lines" && options?.method === "POST") {
        return Promise.resolve({ productLine: { id: "line-new", ...options.body } });
      }
      if (path === "/api/commercial/product-lines/line-1" && !options) {
        return Promise.resolve({
          productLine: {
            id: "line-1",
            name: "Living Soil Line",
            category: "soil",
            status: "testing",
            publicSummary: "Purpose-built soil products",
            description: "Seedling, veg, flower, and topdress products.",
            coverImageUrl: "https://example.com/line.jpg"
          }
        });
      }
      if (
        path === "/api/commercial/product-lines/line-1" &&
        options?.method === "PATCH"
      ) {
        return Promise.resolve({
          productLine: {
            id: "line-1",
            name: "Living Soil Line",
            ...options.body
          }
        });
      }
      if (path === "/api/commercial/products" && !options) {
        return Promise.resolve({
          products: [
            {
              id: "product-1",
              name: "Living Soil Base",
              category: "soil_mix",
              status: "published",
              sku: "LSL-BASE",
              shortDescription: "Seedling-safe base soil",
              growInterests: ["living soil", "seedlings"],
              productLineId: "line-1",
              linkedRecipeId: "recipe-1",
              linkedCourseIds: ["course-1"],
              linkedLiveIds: ["live-1"],
              linkedFeedPostIds: ["campaign-1"],
              forumThreadId: "thread-product",
              externalPurchaseUrl: "https://example.com/base"
            }
          ]
        });
      }
      if (path === "/api/commercial/products" && options?.method === "POST") {
        return Promise.resolve({ product: { id: "product-new", ...options.body } });
      }
      if (path === "/api/commercial/orders" && (!options || options?.method === "GET")) {
        return Promise.resolve({
          orders: [
            {
              id: "order-1",
              productName: "Living Soil Base",
              customerName: "Casey Grower",
              customerEmail: "casey@example.com",
              quantity: 2,
              amountCents: 8400,
              currency: "usd",
              status: "paid",
              fulfillmentStatus: "unfulfilled",
              createdAt: "2026-07-01T12:00:00.000Z"
            }
          ]
        });
      }
      if (path === "/api/tasks" && options?.method === "POST") {
        return Promise.resolve({ task: { id: "task-new", ...options.body } });
      }
      if (path === "/api/commercial/products/product-1" && !options) {
        return Promise.resolve({
          product: {
            id: "product-1",
            name: "Living Soil Base",
            category: "soil_mix",
            status: "published",
            sku: "LSL-BASE",
            shortDescription: "Seedling-safe base soil",
            externalPurchaseUrl: "https://example.com/base",
            unitSize: "1 cu ft bag",
            specs: {
              sourceTool: "soil-builder",
              npk: "3-1-1",
              guaranteedAnalysis: "N 3 / P2O5 1 / K2O 1",
              guaranteedAnalysisEstimate: { N: 3, P2O5: 1, K2O: 1 },
              elementalEstimate: { N: 3, P: 0.4364, K: 0.8301 },
              ingredients: ["Compost", "Aeration", "Dry amendments"],
              directions: "Mix, moisten, and rest before transplant.",
              applicationRate: "Use as full medium",
              releaseCurve: { summary: "fast nitrogen plus slow background" },
              warnings: ["Compost values are estimates unless lab-tested."]
            }
          }
        });
      }
      if (path === "/api/commercial/products/product-1" && options?.method === "PATCH") {
        return Promise.resolve({
          product: {
            id: "product-1",
            name: "Living Soil Base",
            ...options.body
          }
        });
      }
      if (path === "/api/commercial/products/product-1/effectiveness") {
        return Promise.resolve({
          summary: {
            batchCount: 1,
            completedTrialCount: 1,
            growCount: 1,
            courseCount: 1,
            harvestQualityCount: 1,
            commercialCropSummaryCount: 1,
            latestHarvestQualityNotes: "Dense flower with strong citrus aroma.",
            latestCommercialCropSummary:
              "Commercial crop finished with strong quality and clear limitations.",
            publicProofReady: true,
            claimGuard:
              "Use linked batches, grow logs, pH/EC checks, harvest, dry/cure, and trial outcomes before making public product claims.",
            warnings: []
          },
          linked: {
            batches: [{ id: "batch-1" }],
            trials: [{ id: "trial-1" }],
            grows: [{ id: "grow-1" }],
            courses: [{ id: "course-1" }]
          }
        });
      }
      if (path === "/api/commercial/grows" && !options) {
        return Promise.resolve({
          grows: [
            {
              id: "grow-1",
              name: "Bloom Formula Trial",
              purpose: "product_trial",
              cropType: "cannabis",
              cultivar: "Sour Diesel",
              medium: "living_soil",
              productId: "product-1",
              batchId: "batch-1",
              publicShareStatus: "evidence_building",
              measurementPlan: "pH/EC, vigor, diagnosis, harvest quality",
              status: "active"
            }
          ]
        });
      }
      if (path === "/api/commercial/grows" && options?.method === "POST") {
        return Promise.resolve({ grow: { id: "grow-new", ...options.body } });
      }
      if (path === "/api/commercial/grows/grow-1" && !options) {
        return Promise.resolve({
          grow: {
            id: "grow-1",
            name: "Bloom Formula Trial",
            purpose: "product_trial",
            cropType: "cannabis",
            cultivar: "Sour Diesel",
            medium: "living_soil",
            plantCount: 4,
            productId: "product-1",
            productLineId: "line-1",
            batchId: "batch-1",
            formulaVersion: "v1",
            measurementPlan: "Track pH/EC, vigor, diagnosis, harvest, and dry/cure.",
            harvestQualityNotes: "Dense flower, strong citrus fuel aroma, clean dry.",
            commercialCropSummary:
              "Bloom formula trial finished with strong aroma and no major burn.",
            publicShareStatus: "evidence_building",
            status: "active",
            notes: "Needs week three update."
          }
        });
      }
      if (path === "/api/commercial/grows/grow-1" && options?.method === "PATCH") {
        return Promise.resolve({
          grow: {
            id: "grow-1",
            name: "Bloom Formula Trial",
            purpose: "product_trial",
            ...options.body
          }
        });
      }
      if (path === "/api/commercial/batches" && !options) {
        return Promise.resolve({
          batches: [
            {
              id: "batch-1",
              batchName: "Seedling Soil Batch",
              batchCode: "SSB-001",
              purpose: "seedling",
              formulaVersion: "v1",
              productId: "product-1",
              releaseTimelineNotes: "Fast nitrogen plus slow background nutrition",
              status: "ready"
            }
          ]
        });
      }
      if (path === "/api/commercial/batches" && options?.method === "POST") {
        return Promise.resolve({ batch: { id: "batch-new", ...options.body } });
      }
      if (path === "/api/commercial/batches/batch-1" && !options) {
        return Promise.resolve({
          batch: {
            id: "batch-1",
            batchName: "Seedling Soil Batch",
            batchCode: "SSB-001",
            purpose: "seedling",
            formulaVersion: "v1",
            productId: "product-1",
            productLineId: "line-1",
            trialGrowId: "grow-1",
            batchVolume: 40,
            batchVolumeUnit: "cu_ft",
            estimatedCost: 250,
            guaranteedAnalysisNotes: "3-1-1 label target with elemental estimate.",
            releaseTimelineNotes: "Fast nitrogen plus slow background nutrition",
            ingredientSummary: "Compost, aeration, slow background amendments.",
            mixingInstructions: "Blend evenly and rest before use.",
            notes: "Use in seedling safety trial.",
            status: "ready"
          }
        });
      }
      if (path === "/api/commercial/batches/batch-1" && options?.method === "PATCH") {
        return Promise.resolve({
          batch: {
            id: "batch-1",
            batchName: "Seedling Soil Batch",
            ...options.body
          }
        });
      }
      if (path === "/api/commercial/courses" && !options) {
        return Promise.resolve({
          courses: [
            {
              id: "course-1",
              title: "Living Soil Product Use",
              description: "How to use the seedling soil line",
              thumbnailUrl: "https://example.com/course-thumb.jpg",
              category: "product_education",
              growInterests: ["living soil"],
              skillLevel: "beginner",
              access: "free",
              stripeProductId: "prod_course_existing",
              stripePriceId: "price_course_existing",
              linkedLiveIds: ["live-1"],
              modules: [{ title: "Start here" }],
              lessons: [{ title: "Application rate" }],
              tasks: [{ title: "Watch lesson" }],
              status: "draft"
            },
            {
              id: "course-2",
              title: "Bloom Topdress Workshop",
              description: "",
              category: "product_education",
              growInterests: [],
              access: "paid",
              price: 0,
              linkedProductIds: ["product-2"],
              linkedProductLineIds: ["line-1"],
              linkedGrowIds: ["grow-2"],
              linkedLiveIds: ["live-2"],
              linkedFeedPostIds: ["campaign-2"],
              forumThreadId: "thread-course",
              modules: [],
              lessons: [],
              status: "draft"
            }
          ]
        });
      }
      if (path === "/api/commercial/courses" && options?.method === "POST") {
        return Promise.resolve({ course: { id: "course-new", ...options.body } });
      }
      if (path === "/api/commercial/courses/course-1" && !options) {
        return Promise.resolve({
          course: {
            id: "course-1",
            title: "Living Soil Product Use",
            description: "How to use the seedling soil line",
            thumbnailUrl: "https://example.com/course-thumb.jpg",
            bannerUrl: "https://example.com/course-banner.jpg",
            category: "product_education",
            access: "free",
            price: 49,
            growInterests: ["living soil"],
            stripeProductId: "prod_course_existing",
            stripePriceId: "price_course_existing",
            linkedProductIds: ["product-1"],
            linkedProductLineIds: ["line-1"],
            linkedGrowIds: ["grow-1"],
            linkedLiveIds: ["live-1"],
            lessons: [
              {
                id: "lesson-1",
                title: "Application rate",
                body: "Topdress and water in.",
                lessonType: "article",
                relatedProductIds: ["product-1"],
                relatedLiveIds: ["live-1"],
                forumThreadId: "thread-1",
                taskTemplate: { title: "Complete application checklist" },
                status: "draft",
                order: 1
              }
            ],
            status: "draft"
          }
        });
      }
      if (path === "/api/commercial/courses/course-1" && options?.method === "PATCH") {
        return Promise.resolve({
          course: {
            id: "course-1",
            title: "Living Soil Product Use",
            thumbnailUrl: "https://example.com/course-thumb.jpg",
            price: 49,
            growInterests: ["living soil"],
            lessons: [{ id: "lesson-1", title: "Application rate" }],
            ...options.body
          }
        });
      }
      if (
        path === "/api/commercial/courses/course-1/lessons" &&
        options?.method === "POST"
      ) {
        return Promise.resolve({
          course: {
            id: "course-1",
            title: "Living Soil Product Use",
            thumbnailUrl: "https://example.com/course-thumb.jpg",
            price: 49,
            growInterests: ["living soil"],
            lessons: [{ id: "lesson-new", ...options.body }]
          },
          lesson: { id: "lesson-new", ...options.body }
        });
      }
      if (
        path === "/api/commercial/courses/course-1/publish" &&
        options?.method === "POST"
      ) {
        return Promise.resolve({
          course: {
            id: "course-1",
            title: "Living Soil Product Use",
            status: "published"
          }
        });
      }
      if (path === "/api/commercial/feed" && !options?.method) {
        return Promise.resolve({
          items: [
            {
              id: "support-1",
              type: "question",
              title: "How to use Bloom Mix",
              body: "Use it as a measured topdress and water in.",
              tags: ["support"],
              linkedProductId: "product-1",
              linkedCourseId: "course-1",
              storefrontSlug: "living-soil-labs"
            }
          ]
        });
      }
      if (path === "/api/commercial/posts" && options?.method === "POST") {
        return Promise.resolve({ post: { id: "post-new", ...options.body } });
      }
      if (path === "/api/commercial/campaigns" && !options) {
        return Promise.resolve({
          campaigns: [
            {
              id: "campaign-1",
              name: "Bloom Mix Launch",
              description: "Launch linked to the bloom product page",
              objective: "traffic",
              status: "scheduled",
              linkedProductId: "product-1",
              linkedCourseId: "course-1",
              linkedGrowId: "grow-1",
              targetUrl: "https://example.com/bloom",
              clickCount: 42,
              budget: { totalBudget: 125 }
            }
          ]
        });
      }
      if (path === "/api/commercial/campaigns" && options?.method === "POST") {
        return Promise.resolve({ campaign: { id: "campaign-new", ...options.body } });
      }
      if (path === "/api/commercial/trials" && !options) {
        return Promise.resolve({
          trials: [
            {
              id: "trial-1",
              trialName: "Seedling Safety",
              purpose: "seedling_safety",
              status: "planned",
              productId: "product-1"
            }
          ]
        });
      }
      if (path === "/api/commercial/trials" && options?.method === "POST") {
        return Promise.resolve({ trial: { id: "trial-new", ...options.body } });
      }
      if (path === "/api/commercial/trials/trial-1" && !options) {
        return Promise.resolve({
          trial: {
            id: "trial-1",
            trialName: "Seedling Safety",
            purpose: "seedling_safety",
            status: "active",
            productId: "product-1",
            productLineId: "line-1",
            batchId: "batch-1",
            growId: "grow-1",
            cropType: "cannabis",
            cultivar: "Sour Diesel",
            plantCount: 4,
            effectivenessSummary: "Strong seedling emergence with no burn.",
            harvestQualityNotes: "Clean finish with strong aroma after cure.",
            commercialCropSummary:
              "Seedling safety crop completed cleanly with good final quality.",
            notes: "Needs dry/cure data before public claim.",
            AIReview: {
              summary: "Good early vigor, limited final quality data.",
              evidence: ["No seedling burn", "Vigor stayed high"],
              limitations: ["Small sample size"]
            }
          }
        });
      }
      if (path === "/api/commercial/trials/trial-1" && options?.method === "PATCH") {
        return Promise.resolve({
          trial: {
            id: "trial-1",
            trialName: "Seedling Safety",
            ...options.body
          }
        });
      }
      if (
        path === "/api/commercial/trials/trial-1/ai-review" &&
        options?.method === "POST"
      ) {
        return Promise.resolve({
          trial: {
            id: "trial-1",
            trialName: "Seedling Safety",
            AIReview: options.body
          },
          aiReview: options.body
        });
      }
      if (
        path === "/api/commercial/inventory/inventory-1" &&
        (!options || options?.method === "GET")
      ) {
        return Promise.resolve({
          item: {
            id: "inventory-1",
            name: "Kelp Meal",
            itemType: "ingredient",
            category: "dry_amendment",
            quantity: 4,
            unit: "lb",
            reorderPoint: 5,
            vendor: "Amendment Supplier",
            linkedProductId: "product-1",
            linkedGrowId: "grow-1",
            location: "Dry room shelf A",
            status: "active",
            notes: "Used for veg mix test batches"
          }
        });
      }
      if (
        path === "/api/commercial/inventory/inventory-1" &&
        options?.method === "PATCH"
      ) {
        return Promise.resolve({
          item: {
            id: "inventory-1",
            name: "Kelp Meal",
            ...options.data
          }
        });
      }
      if (path === "/api/commercial/analytics/overview") {
        return Promise.resolve({
          overview: {
            adClicks: 42,
            marketingClicks: 19,
            storefrontViews: 100,
            brandProfileViews: 33,
            productViews: 75,
            feedClicks: 12,
            courseStarts: 6,
            forumReplies: 4,
            activeTrials: 3,
            completedTrials: 2,
            breakdowns: {
              ads: [
                {
                  key: "campaign-1",
                  label: "Veg Mix Launch",
                  count: 42,
                  eventTypes: ["ad_click"]
                }
              ],
              products: [
                {
                  key: "product-1",
                  label: "Veg Mix",
                  count: 17,
                  eventTypes: ["product_view", "product_external_link_click"]
                }
              ],
              storefronts: [
                {
                  key: "living-soil-labs",
                  label: "Living Soil Labs",
                  count: 11,
                  eventTypes: ["storefront_view"]
                }
              ],
              links: [
                {
                  key: "https://example.com/veg",
                  label: "Shop Veg Mix",
                  count: 9,
                  eventTypes: ["product_external_link_click"]
                }
              ]
            }
          }
        });
      }
      if (path === "/api/tasks" && options?.method === "POST") {
        return Promise.resolve({ task: { id: "task-dashboard", ...options.body } });
      }
      return Promise.resolve({});
    });
  });

  it("loads commercial home dashboard aggregation from backend", async () => {
    const screen = render(<CommercialHome />);

    expect(screen.getByText("Brand Dashboard")).toBeTruthy();
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/api/commercial/dashboard")
    );
    expect(
      screen.getByText("Storefront: Living Soil Labs /living-soil-labs")
    ).toBeTruthy();
    expect(screen.getByText("Action Items")).toBeTruthy();
    expect(screen.getByText("Bloom Topdress")).toBeTruthy();
    expect(screen.getByText("Dashboard Guidance")).toBeTruthy();
    expect(screen.getAllByText("88").length).toBeGreaterThan(0);
    expect(screen.getAllByText("19").length).toBeGreaterThan(0);

    fireEvent.press(
      screen.getByLabelText("Create task for dashboard action Bloom Topdress")
    );

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/tasks",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            workspaceType: "commercial",
            title: "Resolve dashboard action: Bloom Topdress",
            sourceType: "product",
            sourceId: "product-1",
            sourceObjectId: "product-1",
            actionItemType: "product_missing_batch",
            actionItemTitle: "Bloom Topdress",
            linkedProductId: "product-1",
            priority: "medium",
            reminderPlan: { label: "24 hours before", channels: ["in_app"] }
          })
        })
      )
    );
    expect(screen.getByText("Commercial dashboard task created.")).toBeTruthy();
  });

  it("creates brand community support posts with product links", async () => {
    const screen = render(<CommercialCommunityRoute />);

    expect(screen.getByText("Brand Community")).toBeTruthy();
    expect(screen.getByText("Support thread workflow")).toBeTruthy();
    expect(screen.getByText("Community discovery")).toBeTruthy();
    expect(screen.getByText("Create linked campaign")).toBeTruthy();
    expect(screen.getByText("Public Store Directory")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("How to use Bloom Mix")).toBeTruthy());

    fireEvent.changeText(
      screen.getByLabelText("Brand support post title"),
      "Bloom Mix support"
    );
    fireEvent.changeText(
      screen.getByLabelText("Brand support post body"),
      "Apply after stretch and water in evenly."
    );
    fireEvent.changeText(
      screen.getByLabelText("Brand support linked product"),
      "product-2"
    );
    fireEvent.changeText(
      screen.getByLabelText("Brand support linked course"),
      "course-2"
    );
    fireEvent.changeText(
      screen.getByLabelText("Brand support linked evidence run"),
      "grow-2"
    );
    fireEvent.changeText(
      screen.getByLabelText("Brand support storefront slug"),
      "living-soil-labs"
    );
    fireEvent.changeText(
      screen.getByLabelText("Brand support external link label"),
      "Product guide"
    );
    fireEvent.changeText(
      screen.getByLabelText("Brand support external link URL"),
      "https://example.com/guide"
    );
    fireEvent.changeText(screen.getByLabelText("Brand support tags"), "support,bloom");
    fireEvent.press(screen.getByLabelText("Create brand support post"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/commercial/posts",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            type: "question",
            title: "Bloom Mix support",
            body: "Apply after stretch and water in evenly.",
            linkedProductId: "product-2",
            linkedCourseId: "course-2",
            linkedGrowId: "grow-2",
            storefrontSlug: "living-soil-labs",
            tags: ["support", "bloom"],
            externalLinks: [{ label: "Product guide", url: "https://example.com/guide" }]
          })
        })
      )
    );
  });

  it("manages commercial courses as product education and universal course creation", async () => {
    const screen = render(<CommercialCoursesRoute />);

    expect(screen.getByText("Commercial Course Builder")).toBeTruthy();
    expect(screen.getByText("Course creation workflow")).toBeTruthy();
    expect(screen.getByText("Product education")).toBeTruthy();
    expect(screen.getByText("Free and paid courses")).toBeTruthy();
    expect(screen.getAllByText("Create Course").length).toBeGreaterThan(0);
    expect(screen.getByText("Product Trials")).toBeTruthy();
    expect(screen.getByText("Course setup checklist")).toBeTruthy();
    expect(screen.getByText(/add thumbnail/)).toBeTruthy();
    expect(screen.getByText(/add banner/)).toBeTruthy();
    await waitFor(() => expect(screen.getByText("Living Soil Product Use")).toBeTruthy());
    expect(screen.getByText("Bloom Topdress Workshop")).toBeTruthy();
    expect(screen.getAllByText("Open Detail").length).toBeGreaterThan(0);

    fireEvent.press(
      screen.getByLabelText("Create setup task for Bloom Topdress Workshop")
    );

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/tasks",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            workspaceType: "commercial",
            title: "Complete course setup: Bloom Topdress Workshop",
            sourceType: "course",
            sourceId: "course-2",
            sourceObjectId: "course-2",
            linkedCourseId: "course-2",
            growInterests: [],
            linkedProductIds: ["product-2"],
            linkedProductLineIds: ["line-1"],
            linkedGrowIds: ["grow-2"],
            linkedLiveIds: ["live-2"],
            linkedFeedPostIds: ["campaign-2"],
            linkedForumThreadId: "thread-course",
            priority: "high",
            status: "open",
            reminderPlan: { label: "24 hours before", channels: ["in_app"] }
          })
        })
      )
    );
    expect(
      screen.getByText("Created setup task for Bloom Topdress Workshop.")
    ).toBeTruthy();

    fireEvent.changeText(
      screen.getByLabelText("Commercial course title"),
      "Bloom Topdress Training"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course category"),
      "product_training"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course thumbnail URL"),
      "https://example.com/bloom-course.jpg"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course banner URL"),
      "https://example.com/bloom-banner.jpg"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course grow interests"),
      "living soil, dry amendments"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course skill level"),
      "intermediate"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course description"),
      "How to use the bloom topdress blend"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course linked products"),
      "product-1, product-2"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course linked product lines"),
      "line-1"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course linked evidence runs"),
      "grow-1"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course linked lives"),
      "live-1"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course linked videos"),
      "https://example.com/video-1, https://example.com/video-2"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course documents"),
      "https://example.com/label.pdf"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course module outline"),
      "How the product works\nApplication timing"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course lesson outline"),
      "Read the label\nApply and water in"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course task checklist"),
      "Watch lesson\nComplete product checklist"
    );
    fireEvent.press(screen.getByLabelText("Set commercial course access paid"));
    expect(screen.getAllByText(/connect Stripe product/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/connect Stripe price/).length).toBeGreaterThan(0);
    fireEvent.changeText(screen.getByLabelText("Commercial course price"), "49");
    fireEvent.changeText(
      screen.getByLabelText("Commercial course Stripe product ID"),
      "prod_course_123"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course Stripe price ID"),
      "price_course_123"
    );
    fireEvent.press(screen.getByLabelText("Create commercial course"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/commercial/courses",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            title: "Bloom Topdress Training",
            category: "product_training",
            description: "How to use the bloom topdress blend",
            thumbnailUrl: "https://example.com/bloom-course.jpg",
            bannerUrl: "https://example.com/bloom-banner.jpg",
            growInterests: ["living soil", "dry amendments"],
            skillLevel: "intermediate",
            linkedProductIds: ["product-1", "product-2"],
            linkedProductLineIds: ["line-1"],
            linkedGrowIds: ["grow-1"],
            linkedLiveIds: ["live-1"],
            linkedVideoUrls: [
              "https://example.com/video-1",
              "https://example.com/video-2"
            ],
            documentUrls: ["https://example.com/label.pdf"],
            modules: [
              expect.objectContaining({ title: "How the product works", sortOrder: 1 }),
              expect.objectContaining({ title: "Application timing", sortOrder: 2 })
            ],
            lessons: [
              expect.objectContaining({
                title: "Read the label",
                sortOrder: 1,
                lessonType: "article"
              }),
              expect.objectContaining({
                title: "Apply and water in",
                sortOrder: 2,
                lessonType: "article"
              })
            ],
            tasks: [
              expect.objectContaining({
                title: "Watch lesson",
                sourceType: "course",
                sortOrder: 1
              }),
              expect.objectContaining({
                title: "Complete product checklist",
                sourceType: "course",
                sortOrder: 2
              })
            ],
            access: "paid",
            price: 49,
            stripeProductId: "prod_course_123",
            stripePriceId: "price_course_123",
            status: "draft"
          })
        })
      )
    );
  });

  it("opens and updates commercial course detail with lessons and publish", async () => {
    const screen = render(<CommercialCourseDetailRoute />);

    await waitFor(() => expect(screen.getByText("Living Soil Product Use")).toBeTruthy());
    expect(screen.getByText("Course Record")).toBeTruthy();
    expect(screen.getAllByText("Lessons").length).toBeGreaterThan(0);
    expect(screen.getByText("Commercial Course Loop")).toBeTruthy();
    expect(screen.getByText("Application rate")).toBeTruthy();
    expect(screen.getByText("prod_course_existing")).toBeTruthy();
    expect(screen.getByText("price_course_existing")).toBeTruthy();
    expect(screen.getByText("https://example.com/course-banner.jpg")).toBeTruthy();
    expect(screen.queryByText(/add banner/)).toBeNull();

    fireEvent.changeText(
      screen.getByLabelText("Commercial course detail status"),
      "draft"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course detail access"),
      "paid"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course detail category"),
      "product_training"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course detail grow interests"),
      "living soil, dry amendments"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course detail thumbnail URL"),
      "https://example.com/course-updated-thumb.jpg"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course detail banner URL"),
      "https://example.com/course-updated-banner.jpg"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course detail description"),
      "Updated product course description."
    );
    fireEvent.changeText(screen.getByLabelText("Commercial course detail price"), "59");
    fireEvent.changeText(
      screen.getByLabelText("Commercial course detail Stripe product ID"),
      "prod_course_updated"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course detail Stripe price ID"),
      "price_course_updated"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course detail linked products"),
      "product-1, product-2"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course detail linked product lines"),
      "line-1"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course detail linked evidence runs"),
      "grow-1"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course detail linked lives"),
      "live-1, live-2"
    );
    fireEvent.press(screen.getByLabelText("Save commercial course detail"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/commercial/courses/course-1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.objectContaining({
            status: "draft",
            access: "paid",
            price: 59,
            category: "product_training",
            growInterests: ["living soil", "dry amendments"],
            thumbnailUrl: "https://example.com/course-updated-thumb.jpg",
            bannerUrl: "https://example.com/course-updated-banner.jpg",
            description: "Updated product course description.",
            stripeProductId: "prod_course_updated",
            stripePriceId: "price_course_updated",
            linkedProductIds: ["product-1", "product-2"],
            linkedProductLineIds: ["line-1"],
            linkedGrowIds: ["grow-1"],
            linkedLiveIds: ["live-1", "live-2"]
          })
        })
      )
    );

    fireEvent.changeText(
      screen.getByLabelText("Commercial course lesson title"),
      "Water-in schedule"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course lesson body"),
      "Water in the topdress and check response."
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course lesson type"),
      "assignment"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course lesson related products"),
      "product-1, product-2"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course lesson external video URL"),
      "https://example.com/water-in-demo"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course lesson documents"),
      "https://example.com/water-in-sop.pdf, https://example.com/topdress-chart.pdf"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course lesson related lives"),
      "live-1"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course lesson Forum Q&A thread"),
      "thread-1"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course lesson task title"),
      "Upload topdress photo"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial course lesson task due offset days"),
      "7"
    );
    fireEvent.press(screen.getByLabelText("Add commercial course lesson"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/commercial/courses/course-1/lessons",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            title: "Water-in schedule",
            body: "Water in the topdress and check response.",
            lessonType: "assignment",
            externalVideoUrl: "https://example.com/water-in-demo",
            documentUrls: [
              "https://example.com/water-in-sop.pdf",
              "https://example.com/topdress-chart.pdf"
            ],
            relatedProductIds: ["product-1", "product-2"],
            relatedLiveIds: ["live-1"],
            forumThreadId: "thread-1",
            taskTemplate: expect.objectContaining({
              title: "Upload topdress photo",
              sourceType: "lesson",
              dueOffsetDays: 7,
              completionCriteria: "lesson_action"
            }),
            status: "draft"
          })
        })
      )
    );

    fireEvent.press(screen.getByLabelText("Publish commercial course"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/commercial/courses/course-1/publish",
        expect.objectContaining({
          method: "POST"
        })
      )
    );
  });

  it("creates marketing plans with linked products and click tracking", async () => {
    const screen = render(<CommercialMarketingRoute />);

    expect(screen.getByText("Marketing Planner")).toBeTruthy();
    expect(screen.getByText("Content launch planner")).toBeTruthy();
    expect(screen.getByText("Product drop workflow")).toBeTruthy();
    expect(screen.getByText("Trial-to-content workflow")).toBeTruthy();
    expect(screen.getByText("Create linked campaign")).toBeTruthy();
    expect(screen.getByText("Product Trials")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("Bloom Mix Launch")).toBeTruthy());
    expect(screen.getByText("Ad clicks tracked")).toBeTruthy();
    expect(screen.getAllByText("42").length).toBeGreaterThan(0);

    fireEvent.changeText(screen.getByLabelText("Marketing plan name"), "Veg Mix Drop");
    fireEvent.changeText(
      screen.getByLabelText("Marketing plan description"),
      "Launch the veg mix product page"
    );
    fireEvent.changeText(screen.getByLabelText("Marketing plan objective"), "traffic");
    fireEvent.changeText(screen.getByLabelText("Marketing plan platform"), "multi");
    fireEvent.changeText(screen.getByLabelText("Marketing plan status"), "scheduled");
    fireEvent.changeText(
      screen.getByLabelText("Marketing plan launch date"),
      "2026-08-01"
    );
    fireEvent.changeText(screen.getByLabelText("Marketing plan budget"), "150");
    fireEvent.changeText(
      screen.getByLabelText("Marketing plan linked product"),
      "product-2"
    );
    fireEvent.changeText(
      screen.getByLabelText("Marketing plan linked product line"),
      "line-1"
    );
    fireEvent.changeText(
      screen.getByLabelText("Marketing plan linked course"),
      "course-2"
    );
    fireEvent.changeText(
      screen.getByLabelText("Marketing plan linked evidence run"),
      "grow-2"
    );
    fireEvent.changeText(
      screen.getByLabelText("Marketing plan storefront slug"),
      "living-soil-labs"
    );
    fireEvent.changeText(
      screen.getByLabelText("Marketing plan target URL"),
      "https://example.com/veg"
    );
    fireEvent.changeText(
      screen.getByLabelText("Marketing plan platform notes"),
      "Post to feed and email list"
    );
    fireEvent.press(screen.getByLabelText("Create marketing plan"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/commercial/campaigns",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            name: "Veg Mix Drop",
            description: "Launch the veg mix product page",
            objective: "traffic",
            platform: "multi",
            status: "scheduled",
            launchDate: "2026-08-01",
            linkedProductId: "product-2",
            linkedProductLineId: "line-1",
            linkedCourseId: "course-2",
            linkedGrowId: "grow-2",
            storefrontSlug: "living-soil-labs",
            targetUrl: "https://example.com/veg",
            externalUrl: "https://example.com/veg",
            platformNotes: "Post to feed and email list",
            budget: { totalBudget: 150 }
          })
        })
      )
    );
  });

  it("keeps the legacy campaigns route framed as Marketing Planner", () => {
    const routeSource = fs.readFileSync(
      path.join(process.cwd(), "src", "app", "campaigns", "index.tsx"),
      "utf8"
    );

    expect(routeSource).toContain("Marketing Planner");
    expect(routeSource).toContain("Create Marketing Plan");
    expect(routeSource).toContain('objective: "content_plan"');
    expect(routeSource).toContain('accessibilityLabel="Create marketing plan"');
    expect(routeSource).toContain("No Marketing Plans Yet");
    expect(routeSource).not.toContain(">Create Campaign<");
    expect(routeSource).not.toContain(">No Campaigns Yet<");
  });

  it("manages products with public storefront fields", async () => {
    const screen = render(<CommercialProductsRoute />);

    expect(screen.getAllByText("Products").length).toBeGreaterThan(0);
    expect(screen.getByText("Product catalog")).toBeTruthy();
    expect(screen.getByText("Public product page workflow")).toBeTruthy();
    expect(screen.getByText("Soil and nutrient product path")).toBeTruthy();
    expect(screen.getByText("Garden center and retail product path")).toBeTruthy();
    expect(screen.getAllByText("Batch Planner").length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getByText("Living Soil Base")).toBeTruthy());
    expect(screen.getByText("Open Detail")).toBeTruthy();
    expect(screen.getByText("Product publish blocked")).toBeTruthy();
    expect(screen.getByText(/add image/)).toBeTruthy();
    expect(
      screen.getByLabelText("Toggle commercial product publish status").props
        .accessibilityState?.disabled
    ).toBe(true);
    fireEvent.press(screen.getByLabelText("Create setup task for Living Soil Base"));
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/tasks",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            workspaceType: "commercial",
            title: "Complete product setup: Living Soil Base",
            sourceType: "product",
            sourceId: "product-1",
            sourceObjectId: "product-1",
            linkedProductId: "product-1",
            growInterests: ["living soil", "seedlings"],
            linkedProductLineId: "line-1",
            linkedRecipeId: "recipe-1",
            linkedCourseIds: ["course-1"],
            linkedLiveIds: ["live-1"],
            linkedFeedPostIds: ["campaign-1"],
            linkedForumThreadId: "thread-product",
            priority: "normal",
            reminderPlan: { label: "24 hours before", channels: ["in_app"] }
          })
        })
      )
    );
    expect(screen.getByText("Created setup task for Living Soil Base.")).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText("Commercial product name"), "Bloom Mix");
    fireEvent.changeText(
      screen.getByLabelText("Commercial product category"),
      "dry_amendment"
    );
    fireEvent.changeText(screen.getByLabelText("Commercial product SKU"), "BLOOM-1");
    fireEvent.changeText(
      screen.getByLabelText("Commercial product image URL"),
      "https://example.com/bloom.jpg"
    );
    fireEvent.changeText(screen.getByLabelText("Commercial product price"), "29.99");
    fireEvent.changeText(
      screen.getByLabelText("Commercial product size or weight"),
      "5 lb bag"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial product grow interests"),
      "living soil, dry amendments"
    );
    fireEvent.changeText(screen.getByLabelText("Commercial product NPK"), "3-1-1");
    fireEvent.changeText(
      screen.getByLabelText("Commercial product application rate"),
      "1 cup per cubic foot"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial product external purchase URL"),
      "https://example.com/bloom"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial product guaranteed analysis"),
      "N 3\nP2O5 1\nK2O 1"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial product ingredients"),
      "Alfalfa meal\nFish bone meal"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial product directions"),
      "Topdress and water in."
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial product short description"),
      "Flower topdress blend"
    );
    expect(
      screen.getByLabelText("Toggle commercial product publish status").props
        .accessibilityState?.disabled
    ).toBe(false);
    fireEvent.press(screen.getByLabelText("Toggle commercial product publish status"));
    fireEvent.press(screen.getByLabelText("Create commercial product"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/commercial/products",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            name: "Bloom Mix",
            category: "dry_amendment",
            sku: "BLOOM-1",
            imageUrl: "https://example.com/bloom.jpg",
            price: 29.99,
            unitSize: "5 lb bag",
            growInterests: ["living soil", "dry amendments"],
            externalPurchaseUrl: "https://example.com/bloom",
            shortDescription: "Flower topdress blend",
            specs: expect.objectContaining({
              unitSize: "5 lb bag",
              npk: "3-1-1",
              guaranteedAnalysis: "N 3\nP2O5 1\nK2O 1",
              ingredients: ["Alfalfa meal", "Fish bone meal"],
              directions: "Topdress and water in.",
              applicationRate: "1 cup per cubic foot"
            }),
            status: "published"
          })
        })
      )
    );
  });

  it("opens and updates commercial product detail with effectiveness snapshot", async () => {
    const screen = render(<CommercialProductDetailRoute />);

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/api/commercial/products/product-1")
    );
    expect(screen.getByText("Commercial product workspace")).toBeTruthy();
    expect(screen.getAllByText("Living Soil Base").length).toBeGreaterThan(0);
    expect(screen.getByText("Effectiveness Snapshot")).toBeTruthy();
    expect(screen.getByText("Linked Evidence")).toBeTruthy();
    expect(screen.getByText("Label / Use Specs")).toBeTruthy();
    expect(screen.getByText("soil-builder")).toBeTruthy();
    expect(screen.getByText("3-1-1")).toBeTruthy();
    expect(screen.getByText("N 3 / P2O5 1 / K2O 1")).toBeTruthy();
    expect(screen.getByText("N: 3, P2O5: 1, K2O: 1")).toBeTruthy();
    expect(screen.getByText("N: 3, P: 0.4364, K: 0.8301")).toBeTruthy();
    expect(screen.getByText("Compost, Aeration, Dry amendments")).toBeTruthy();
    expect(screen.getByText("Mix, moisten, and rest before transplant.")).toBeTruthy();
    expect(screen.getByText("fast nitrogen plus slow background")).toBeTruthy();
    expect(
      screen.getByText("Compost values are estimates unless lab-tested.")
    ).toBeTruthy();
    expect(screen.getByText("Harvest quality notes")).toBeTruthy();
    expect(screen.getByText("Crop summaries")).toBeTruthy();
    expect(
      screen.getByText("Latest harvest quality: Dense flower with strong citrus aroma.")
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Latest crop summary: Commercial crop finished with strong quality and clear limitations."
      )
    ).toBeTruthy();
    expect(
      screen.getByText("Public proof ready from linked batch and completed trial.")
    ).toBeTruthy();

    fireEvent.changeText(
      screen.getByLabelText("Commercial product detail status"),
      "draft"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial product detail image URL"),
      "https://example.com/base-updated.jpg"
    );
    fireEvent.changeText(screen.getByLabelText("Commercial product detail price"), "39");
    fireEvent.changeText(
      screen.getByLabelText("Commercial product detail size or weight"),
      "2 cu ft bag"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial product detail external URL"),
      "https://example.com/new-base"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial product detail Stripe price ID"),
      "price_product_updated"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial product detail short description"),
      "Updated product copy."
    );
    fireEvent.press(screen.getByLabelText("Save commercial product detail"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/commercial/products/product-1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.objectContaining({
            status: "draft",
            imageUrl: "https://example.com/base-updated.jpg",
            price: 39,
            unitSize: "2 cu ft bag",
            externalPurchaseUrl: "https://example.com/new-base",
            stripePriceId: "price_product_updated",
            shortDescription: "Updated product copy.",
            description: "Updated product copy.",
            specs: expect.objectContaining({
              unitSize: "2 cu ft bag"
            })
          })
        })
      )
    );
  });

  it("blocks incomplete commercial product detail publish transitions", async () => {
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/commercial/products/product-1" && !options) {
        return Promise.resolve({
          product: {
            id: "product-1",
            name: "Incomplete Product",
            status: "draft",
            shortDescription: "Needs public storefront setup"
          }
        });
      }
      if (path === "/api/commercial/products/product-1/effectiveness") {
        return Promise.resolve({ summary: {}, linked: {} });
      }
      if (path === "/api/commercial/products/product-1" && options?.method === "PATCH") {
        return Promise.resolve({ product: { id: "product-1", ...options.body } });
      }
      return Promise.resolve({});
    });
    const screen = render(<CommercialProductDetailRoute />);

    await waitFor(() => expect(screen.getByText("Incomplete Product")).toBeTruthy());

    fireEvent.changeText(
      screen.getByLabelText("Commercial product detail status"),
      "published"
    );
    fireEvent.press(screen.getByLabelText("Save commercial product detail"));

    await waitFor(() =>
      expect(screen.getByText(/Product publish blocked: missing/)).toBeTruthy()
    );
    expect(
      mockApiRequest.mock.calls.some(
        ([path, options]) =>
          path === "/api/commercial/products/product-1" && options?.method === "PATCH"
      )
    ).toBe(false);
  });

  it("routes create-product to the real product form", async () => {
    const screen = render(<NewCommercialProductRoute />);

    expect(screen.getAllByText("Create Product").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Commercial product name")).toBeTruthy();
    expect(
      screen.getByLabelText("Commercial product external purchase URL")
    ).toBeTruthy();
    await waitFor(() => expect(screen.getByText("Living Soil Base")).toBeTruthy());
  });

  it("manages product lines as public storefront and brand families", async () => {
    const screen = render(<CommercialProductLinesRoute />);

    await waitFor(() =>
      expect(screen.getAllByText("Product Lines").length).toBeGreaterThan(0)
    );
    expect(screen.getByText(/Product family workflow:/)).toBeTruthy();
    expect(screen.getByText("Line-level public page context")).toBeTruthy();
    expect(screen.getByText("Brand-type examples")).toBeTruthy();
    expect(screen.getByText("Marketing Planner")).toBeTruthy();

    await waitFor(() => expect(screen.getByText("Living Soil Line")).toBeTruthy());
    expect(screen.getByText("Open Detail")).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText("Product line name"), "Bloom Line");
    fireEvent.changeText(screen.getByLabelText("Product line category"), "nutrient");
    fireEvent.changeText(
      screen.getByLabelText("Product line public summary"),
      "Flower support products"
    );
    fireEvent.press(screen.getByLabelText("Create product line"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/commercial/product-lines",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            name: "Bloom Line",
            category: "nutrient",
            publicSummary: "Flower support products",
            status: "draft"
          })
        })
      )
    );
  });

  it("opens and updates commercial product line detail", async () => {
    const screen = render(<CommercialProductLineDetailRoute />);

    await waitFor(() => expect(screen.getByText("Living Soil Line")).toBeTruthy());
    expect(screen.getByText("Commercial Links")).toBeTruthy();
    expect(screen.getByText("Public Use")).toBeTruthy();
    expect(screen.getByText("Purpose-built soil products")).toBeTruthy();

    fireEvent.changeText(
      screen.getByLabelText("Commercial product line detail status"),
      "active"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial product line detail public summary"),
      "Updated public line summary."
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial product line detail cover image URL"),
      "https://example.com/new-line.jpg"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial product line detail description"),
      "Updated line description."
    );
    fireEvent.press(screen.getByLabelText("Save commercial product line detail"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/commercial/product-lines/line-1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.objectContaining({
            status: "active",
            publicSummary: "Updated public line summary.",
            coverImageUrl: "https://example.com/new-line.jpg",
            description: "Updated line description."
          })
        })
      )
    );
  });

  it("manages product trials as evidence collection with claim guardrails", async () => {
    const screen = render(<CommercialTrialsRoute />);

    await waitFor(() =>
      expect(screen.getAllByText("Product Trials").length).toBeGreaterThan(0)
    );
    expect(screen.getByText("Evidence collection loop")).toBeTruthy();
    expect(screen.getByText("Claim guard")).toBeTruthy();
    expect(screen.getByText("Publishable result")).toBeTruthy();
    expect(screen.getByText(/Run Comparison when/)).toBeTruthy();
    expect(screen.getByText("Create Evidence Run")).toBeTruthy();
    expect(screen.UNSAFE_getByProps({ href: "/home/commercial/grows/new" })).toBeTruthy();
    expect(screen.UNSAFE_getByProps({ href: "/home/commercial/products" })).toBeTruthy();
    expect(screen.queryByText("Create Personal Grow")).toBeNull();

    await waitFor(() => expect(screen.getByText("Seedling Safety")).toBeTruthy());
    expect(screen.getByText("Open Detail")).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText("Product trial name"), "Bloom Trial");
    fireEvent.changeText(
      screen.getByLabelText("Product trial purpose"),
      "flower_performance"
    );
    fireEvent.changeText(screen.getByLabelText("Trial product id"), "product-2");
    fireEvent.changeText(screen.getByLabelText("Trial batch id"), "batch-1");
    fireEvent.changeText(screen.getByLabelText("Trial grow id"), "grow-1");
    fireEvent.changeText(screen.getByLabelText("Trial plant count"), "8");
    fireEvent.press(screen.getByLabelText("Create product trial"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/commercial/trials",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            trialName: "Bloom Trial",
            purpose: "flower_performance",
            productId: "product-2",
            batchId: "batch-1",
            growId: "grow-1",
            plantCount: 8,
            status: "planned"
          })
        })
      )
    );
  });

  it("opens and updates commercial product trial detail evidence", async () => {
    const screen = render(<CommercialTrialDetailRoute />);

    await waitFor(() => expect(screen.getByText("Seedling Safety")).toBeTruthy());
    expect(screen.getByText("Linked Commercial Evidence")).toBeTruthy();
    expect(screen.getByText("Claim Readiness")).toBeTruthy();
    expect(screen.getByText("Evidence building")).toBeTruthy();
    expect(screen.getByText("Missing complete trial")).toBeTruthy();
    expect(screen.getByText("Missing add measurement data")).toBeTruthy();
    expect(screen.getByText("Claim-Safe AI Review")).toBeTruthy();
    expect(screen.getByText("Publish Path")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Create trial evidence task"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/tasks",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            workspaceType: "commercial",
            title: "Complete trial evidence: Seedling Safety",
            sourceType: "product_trial",
            sourceId: "trial-1",
            sourceObjectId: "trial-1",
            linkedProductTrialId: "trial-1",
            linkedProductId: "product-1",
            linkedProductBatchId: "batch-1",
            linkedGrowId: "grow-1",
            priority: "high",
            status: "open",
            reminderPlan: { label: "24 hours before", channels: ["in_app"] }
          })
        })
      )
    );
    expect(screen.getByText("Created evidence task for Seedling Safety.")).toBeTruthy();
    expect(
      screen.getByLabelText("Commercial trial effectiveness summary").props.value
    ).toBe("Strong seedling emergence with no burn.");
    expect(
      screen.getByLabelText("Commercial trial harvest quality notes").props.value
    ).toBe("Clean finish with strong aroma after cure.");
    expect(screen.getByLabelText("Commercial trial crop summary").props.value).toBe(
      "Seedling safety crop completed cleanly with good final quality."
    );

    fireEvent.changeText(screen.getByLabelText("Commercial trial status"), "complete");
    fireEvent.changeText(
      screen.getByLabelText("Commercial trial effectiveness summary"),
      "Completed trial with clean seedling response."
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial trial harvest quality notes"),
      "Strong aroma, clean dry, no mold, good bag appeal."
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial trial crop summary"),
      "Crop summary supports a cautious public proof point."
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial trial notes"),
      "Ready for cautious storefront proof."
    );
    fireEvent.press(screen.getByLabelText("Save commercial trial detail"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/commercial/trials/trial-1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.objectContaining({
            status: "complete",
            effectivenessSummary: "Completed trial with clean seedling response.",
            harvestQualityNotes: "Strong aroma, clean dry, no mold, good bag appeal.",
            commercialCropSummary: "Crop summary supports a cautious public proof point.",
            notes: "Ready for cautious storefront proof."
          })
        })
      )
    );

    fireEvent.changeText(
      screen.getByLabelText("Commercial trial AI review summary"),
      "Strong result with limited sample size."
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial trial AI review evidence"),
      "No burn\nGood vigor"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial trial AI review limitations"),
      "Small sample size"
    );
    fireEvent.press(screen.getByLabelText("Save commercial trial AI review"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/commercial/trials/trial-1/ai-review",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            summary: "Strong result with limited sample size.",
            evidence: ["No burn", "Good vigor"],
            limitations: ["Small sample size"]
          })
        })
      )
    );
  });

  it("opens commercial inventory detail and keeps it connected to business workflows", async () => {
    const screen = render(<CommercialInventoryItemDetailRoute />);

    await waitFor(() => expect(screen.getByText("Kelp Meal")).toBeTruthy());
    expect(screen.getByLabelText("Back")).toBeTruthy();
    expect(screen.getByText("Connected Workflows")).toBeTruthy();
    expect(screen.getByText("Linked Product")).toBeTruthy();
    expect(screen.getByText("Linked Evidence Run")).toBeTruthy();
    expect(screen.getByText("Batch Planner")).toBeTruthy();
    expect(screen.getByText("Product Trials")).toBeTruthy();
    expect(screen.getByText("Storefront")).toBeTruthy();
    expect(screen.getByLabelText("Commercial detail item type").props.value).toBe(
      "ingredient"
    );

    fireEvent.changeText(
      screen.getByLabelText("Commercial detail notes"),
      "Restocked for trial batches."
    );
    fireEvent.press(screen.getByLabelText("Save commercial inventory changes"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/commercial/inventory/inventory-1",
        expect.objectContaining({
          method: "PATCH",
          data: expect.objectContaining({
            notes: "Restocked for trial batches.",
            linkedProductId: "product-1",
            linkedGrowId: "grow-1"
          })
        })
      )
    );
  });

  it("manages commercial batches as formula-to-product-to-trial workflow", async () => {
    const screen = render(<CommercialBatchPlannerRoute />);

    expect(screen.getByText("Soil & Nutrient Batch Planner")).toBeTruthy();
    expect(screen.getByText("Formula-to-product workflow")).toBeTruthy();
    expect(screen.getByText("Effectiveness loop")).toBeTruthy();
    expect(screen.getByText("Naming rule")).toBeTruthy();
    expect(screen.getByText("Product Lines")).toBeTruthy();
    expect(screen.getByText("Create Product Draft")).toBeTruthy();
    expect(screen.UNSAFE_getByProps({ href: "/home/commercial/products/new" })).toBeTruthy();
    expect(screen.queryByText("Open Personal Batch Tool")).toBeNull();
    await waitFor(() => expect(screen.getByText("Seedling Soil Batch")).toBeTruthy());
    expect(screen.getByText("Open Detail")).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText("Commercial batch name"), "Bloom Batch");
    fireEvent.changeText(screen.getByLabelText("Commercial batch code"), "BB-001");
    fireEvent.changeText(screen.getByLabelText("Commercial batch purpose"), "flower");
    fireEvent.changeText(screen.getByLabelText("Commercial batch formula version"), "v3");
    fireEvent.changeText(
      screen.getByLabelText("Commercial batch product id"),
      "product-2"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial batch product line id"),
      "line-2"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial batch evidence run id"),
      "grow-2"
    );
    fireEvent.changeText(screen.getByLabelText("Commercial batch volume"), "40");
    fireEvent.changeText(screen.getByLabelText("Commercial batch estimated cost"), "250");
    fireEvent.changeText(
      screen.getByLabelText("Commercial batch guaranteed analysis notes"),
      "3-1-1 label target"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial batch release timeline notes"),
      "1-1-1 slow background plus fast nitrogen"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial batch ingredient summary"),
      "Compost, aeration, dry amendments"
    );
    fireEvent.press(screen.getByLabelText("Create commercial batch"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/commercial/batches",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            batchName: "Bloom Batch",
            batchCode: "BB-001",
            purpose: "flower",
            formulaVersion: "v3",
            productId: "product-2",
            productLineId: "line-2",
            trialGrowId: "grow-2",
            batchVolume: 40,
            estimatedCost: 250,
            guaranteedAnalysisNotes: "3-1-1 label target",
            releaseTimelineNotes: "1-1-1 slow background plus fast nitrogen",
            ingredientSummary: "Compost, aeration, dry amendments",
            status: "planned"
          })
        })
      )
    );
  });

  it("opens and updates commercial batch detail formula evidence", async () => {
    const screen = render(<CommercialBatchDetailRoute />);

    await waitFor(() => expect(screen.getByText("Seedling Soil Batch")).toBeTruthy());
    expect(screen.getByText("Formula Evidence")).toBeTruthy();
    expect(screen.getByText("Linked Commercial Workflow")).toBeTruthy();
    expect(screen.getByText("Commercial Use Rules")).toBeTruthy();
    expect(
      screen.getByLabelText("Commercial batch detail guaranteed analysis notes").props
        .value
    ).toBe("3-1-1 label target with elemental estimate.");

    fireEvent.changeText(screen.getByLabelText("Commercial batch detail status"), "used");
    fireEvent.changeText(
      screen.getByLabelText("Commercial batch detail estimated cost"),
      "275"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial batch detail guaranteed analysis notes"),
      "Updated guaranteed analysis notes."
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial batch detail release timeline notes"),
      "Updated release timeline notes."
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial batch detail ingredient summary"),
      "Updated ingredient pull sheet."
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial batch detail mixing instructions"),
      "Updated mixing instructions."
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial batch detail notes"),
      "Updated batch notes."
    );
    fireEvent.press(screen.getByLabelText("Save commercial batch detail"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/commercial/batches/batch-1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.objectContaining({
            status: "used",
            estimatedCost: 275,
            guaranteedAnalysisNotes: "Updated guaranteed analysis notes.",
            releaseTimelineNotes: "Updated release timeline notes.",
            ingredientSummary: "Updated ingredient pull sheet.",
            mixingInstructions: "Updated mixing instructions.",
            notes: "Updated batch notes."
          })
        })
      )
    );
  });

  it("manages product trial evidence runs as private evidence source for public claims", async () => {
    const screen = render(<CommercialGrowsRoute />);

    expect(screen.getByText("Product Trial Evidence Runs")).toBeTruthy();
    expect(screen.getAllByText("Product trial evidence layer").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Product Trials").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Batch Planner").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Create Evidence Run").length).toBeGreaterThan(0);
    expect(screen.UNSAFE_getAllByProps({ href: "/home/commercial/grows/new" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("Open Grow Workspace")).toBeNull();
    expect(screen.queryByText("Open grow list")).toBeNull();
    await waitFor(() => expect(screen.getByText("Bloom Formula Trial")).toBeTruthy());
    expect(screen.getByText("Open Detail")).toBeTruthy();

    fireEvent.changeText(
      screen.getByLabelText("Product trial evidence run name"),
      "Veg Mix Trial"
    );
    fireEvent.changeText(
      screen.getByLabelText("Product trial evidence run purpose"),
      "soil_trial"
    );
    fireEvent.changeText(
      screen.getByLabelText("Product trial evidence run crop type"),
      "tomato"
    );
    fireEvent.changeText(
      screen.getByLabelText("Product trial evidence run cultivar"),
      "Cherokee Purple"
    );
    fireEvent.changeText(
      screen.getByLabelText("Product trial evidence run medium"),
      "raised_bed"
    );
    fireEvent.changeText(
      screen.getByLabelText("Product trial evidence run plant count"),
      "12"
    );
    fireEvent.changeText(
      screen.getByLabelText("Product trial evidence run product id"),
      "product-2"
    );
    fireEvent.changeText(
      screen.getByLabelText("Product trial evidence run product line id"),
      "line-1"
    );
    fireEvent.changeText(
      screen.getByLabelText("Product trial evidence run batch id"),
      "batch-2"
    );
    fireEvent.changeText(
      screen.getByLabelText("Product trial evidence run formula version"),
      "v2"
    );
    fireEvent.changeText(
      screen.getByLabelText("Product trial evidence run measurement plan"),
      "Weekly vigor and pH checks"
    );
    fireEvent.press(screen.getByLabelText("Create product trial evidence run"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/commercial/grows",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            name: "Veg Mix Trial",
            purpose: "soil_trial",
            cropType: "tomato",
            cultivar: "Cherokee Purple",
            medium: "raised_bed",
            plantCount: 12,
            productId: "product-2",
            productLineId: "line-1",
            batchId: "batch-2",
            formulaVersion: "v2",
            measurementPlan: "Weekly vigor and pH checks",
            status: "active"
          })
        })
      )
    );
  });

  it("opens and updates product trial evidence run detail as evidence workspace", async () => {
    const screen = render(<CommercialGrowDetailRoute />);

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/api/commercial/grows/grow-1")
    );
    expect(screen.getByText("Product trial evidence run")).toBeTruthy();
    expect(screen.getAllByText("Bloom Formula Trial").length).toBeGreaterThan(0);
    expect(screen.getByText("Commercial Context")).toBeTruthy();
    expect(screen.getByText("Linked Evidence")).toBeTruthy();
    expect(screen.getByText("Measurement Plan")).toBeTruthy();
    expect(screen.getByText("Harvest Quality Notes")).toBeTruthy();
    expect(screen.getByText("Commercial Crop Summary")).toBeTruthy();
    expect(screen.queryByText("Pro Grow Workspace")).toBeNull();
    expect(screen.UNSAFE_getByProps({ href: "/home/commercial/products" })).toBeTruthy();
    expect(
      screen.getByLabelText("Product trial evidence run harvest quality notes").props
        .value
    ).toBe("Dense flower, strong citrus fuel aroma, clean dry.");
    expect(
      screen.getByLabelText("Product trial evidence run crop summary").props.value
    ).toBe("Bloom formula trial finished with strong aroma and no major burn.");
    expect(screen.getByText("Create Feed Campaign")).toBeTruthy();

    fireEvent.changeText(
      screen.getByLabelText("Product trial evidence run detail status"),
      "completed"
    );
    fireEvent.changeText(
      screen.getByLabelText("Product trial evidence run detail public share status"),
      "public_ready"
    );
    fireEvent.changeText(
      screen.getByLabelText("Product trial evidence run detail notes"),
      "Ready for public trial summary."
    );
    fireEvent.changeText(
      screen.getByLabelText("Product trial evidence run harvest quality notes"),
      "High aroma, clean burn, dense flower."
    );
    fireEvent.changeText(
      screen.getByLabelText("Product trial evidence run crop summary"),
      "Commercial crop finished with strong quality and clear next-run notes."
    );
    fireEvent.press(screen.getByLabelText("Save product trial evidence run detail"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/commercial/grows/grow-1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.objectContaining({
            status: "completed",
            publicShareStatus: "public_ready",
            harvestQualityNotes: "High aroma, clean burn, dense flower.",
            commercialCropSummary:
              "Commercial crop finished with strong quality and clear next-run notes.",
            notes: "Ready for public trial summary."
          })
        })
      )
    );
  });

  it("routes product trial evidence run creation to the real evidence form", async () => {
    const screen = render(<NewCommercialGrowRoute />);

    expect(
      screen.getAllByText("Create Product Trial Evidence Run").length
    ).toBeGreaterThan(0);
    expect(screen.getByText("Trial setup checklist")).toBeTruthy();
    expect(
      screen.getByText(
        "Measurement plan: pH/EC, vigor, diagnosis, steering, harvest, dry/cure, final quality"
      )
    ).toBeTruthy();
    expect(screen.getByLabelText("Product trial evidence run name")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("Bloom Formula Trial")).toBeTruthy());
  });

  it("describes analytics as event-backed external clicks and trial outcomes", async () => {
    const screen = render(<CommercialAnalyticsRoute />);

    expect(screen.getByText("Commercial Analytics")).toBeTruthy();
    expect(screen.getByText("Simple metrics first")).toBeTruthy();
    expect(screen.getByText("Ad and marketing click counts")).toBeTruthy();
    expect(screen.getByText("External checkout reality")).toBeTruthy();
    expect(screen.getByText("Trial and content outcomes")).toBeTruthy();
    expect(screen.getAllByText("Orders").length).toBeGreaterThan(0);
    expect(screen.getByText("Product Trials")).toBeTruthy();
    await waitFor(() => expect(screen.getAllByText("42").length).toBeGreaterThan(0));
  });

  it("loads commercial orders from the commercial workspace route", async () => {
    const screen = render(<CommercialOrdersRoute />);

    expect(screen.getAllByText("Orders").length).toBeGreaterThan(0);
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/api/commercial/orders", {
        method: "GET"
      })
    );
    expect(screen.getByText("Living Soil Base")).toBeTruthy();
    expect(screen.getByText("Casey Grower | casey@example.com")).toBeTruthy();
    expect(screen.getAllByText("$84.00").length).toBeGreaterThan(0);
  });

  it("loads commercial analytics overview including ad clicks", async () => {
    const screen = render(<CommercialAnalyticsRoute />);

    await waitFor(() => expect(screen.getByText("Ad clicks")).toBeTruthy());
    expect(screen.getAllByText("42").length).toBeGreaterThan(0);
    expect(screen.getByText("Marketing link clicks")).toBeTruthy();
    expect(screen.getByText("19")).toBeTruthy();
    expect(screen.getByText("Brand profile views")).toBeTruthy();
    expect(screen.getByText("33")).toBeTruthy();
    expect(screen.getByText("Click and View Breakdown")).toBeTruthy();
    expect(screen.getByText("Veg Mix Launch")).toBeTruthy();
    expect(screen.getByText("Veg Mix")).toBeTruthy();
    expect(screen.getByText("Living Soil Labs")).toBeTruthy();
    expect(screen.getByText("Shop Veg Mix")).toBeTruthy();
  });
});
