import { expect, test } from "@playwright/test";

type Persona = {
  key: string;
  email: string;
  requestedPlan: "free" | "pro" | "commercial" | "facility";
  subscriptionStatus: "free" | "active";
  mode: "personal" | "commercial" | "facility";
  facilityRole?: "OWNER" | "MANAGER" | "STAFF" | "VIEWER";
};

const PERSONAS: Record<string, Persona> = {
  personalFree: {
    key: "personal-free",
    email: "personal-free@example.com",
    requestedPlan: "free",
    subscriptionStatus: "free",
    mode: "personal"
  },
  personalPro: {
    key: "personal-pro",
    email: "personal-pro@example.com",
    requestedPlan: "pro",
    subscriptionStatus: "active",
    mode: "personal"
  },
  commercialFree: {
    key: "commercial-free",
    email: "commercial-free@example.com",
    requestedPlan: "commercial",
    subscriptionStatus: "free",
    mode: "commercial"
  },
  commercialPaid: {
    key: "commercial-paid",
    email: "commercial-paid@example.com",
    requestedPlan: "commercial",
    subscriptionStatus: "active",
    mode: "commercial"
  },
  facilityFree: {
    key: "facility-free",
    email: "facility-free@example.com",
    requestedPlan: "facility",
    subscriptionStatus: "free",
    mode: "facility",
    facilityRole: "MANAGER"
  },
  facilityPaid: {
    key: "facility-paid",
    email: "facility-paid@example.com",
    requestedPlan: "facility",
    subscriptionStatus: "active",
    mode: "facility",
    facilityRole: "OWNER"
  },
  facilityStaff: {
    key: "facility-staff",
    email: "facility-staff@example.com",
    requestedPlan: "facility",
    subscriptionStatus: "active",
    mode: "facility",
    facilityRole: "STAFF"
  },
  facilityViewer: {
    key: "facility-viewer",
    email: "facility-viewer@example.com",
    requestedPlan: "facility",
    subscriptionStatus: "active",
    mode: "facility",
    facilityRole: "VIEWER"
  }
};

function activePlan(persona: Persona) {
  if (persona.requestedPlan === "free") return "free";
  return persona.subscriptionStatus === "active" ? persona.requestedPlan : "free";
}

function capabilitiesFor(persona: Persona) {
  const paidPersonal =
    persona.subscriptionStatus === "active" &&
    ["pro", "commercial", "facility"].includes(persona.requestedPlan);
  const facilityManager = ["OWNER", "MANAGER"].includes(persona.facilityRole || "VIEWER");
  const facilityWorker = [...["OWNER", "MANAGER", "STAFF"]].includes(
    persona.facilityRole || "VIEWER"
  );
  return {
    GROWS_PERSONAL_VIEW: true,
    GROWS_PERSONAL_WRITE: paidPersonal,
    LOGS_PERSONAL_VIEW: true,
    LOGS_PERSONAL_WRITE: paidPersonal,
    PLANTS_PERSONAL_VIEW: true,
    PLANTS_PERSONAL_WRITE: paidPersonal,
    TOOLS_VPD: true,
    AI_ASSISTANT: paidPersonal,
    DIAGNOSE_AI: paidPersonal,
    DIAGNOSE_ADVANCED: paidPersonal,
    TOOL_NPK: paidPersonal,
    TOOL_HARVEST_ESTIMATOR: paidPersonal,
    TOOL_TIMELINE_PLANNER: paidPersonal,
    TOOL_PDF_EXPORT: paidPersonal,
    TOOL_PHENO_MATRIX: paidPersonal,
    FEEDING_SCHEDULE: paidPersonal,
    TASK_REMINDERS: paidPersonal,
    COURSES_VIEW: true,
    COURSES_CREATE: true,
    COURSES_SELL_PAID: true,
    FORUM_VIEW: true,
    FORUM_POST: true,
    COMMERCIAL_HOME: persona.mode === "commercial" || persona.mode === "facility",
    COMMERCIAL_INVENTORY_VIEW:
      persona.mode === "commercial" || persona.mode === "facility",
    COMMERCIAL_INVENTORY_WRITE:
      persona.mode === "commercial" || persona.mode === "facility",
    COMMERCIAL_FEED_VIEW: persona.mode === "commercial" || persona.mode === "facility",
    COMMERCIAL_ALERTS_VIEW: persona.mode === "commercial" || persona.mode === "facility",
    STORE_FRONT_VIEW: persona.mode === "commercial" || persona.mode === "facility",
    FACILITY_ACCESS: persona.mode === "facility",
    TASKS_READ: persona.mode === "facility",
    TASKS_WRITE:
      persona.mode === "facility" &&
      persona.subscriptionStatus === "active" &&
      facilityWorker,
    GROWS_READ: persona.mode === "facility",
    GROWS_WRITE:
      persona.mode === "facility" &&
      persona.subscriptionStatus === "active" &&
      facilityManager,
    PLANTS_READ: persona.mode === "facility",
    PLANTS_WRITE:
      persona.mode === "facility" &&
      persona.subscriptionStatus === "active" &&
      facilityManager,
    INVENTORY_READ: persona.mode === "facility",
    INVENTORY_WRITE:
      persona.mode === "facility" &&
      persona.subscriptionStatus === "active" &&
      facilityManager,
    COMPLIANCE_READ: persona.mode === "facility",
    COMPLIANCE_WRITE:
      persona.mode === "facility" && persona.subscriptionStatus === "active",
    AUDIT_READ: persona.mode === "facility",
    SOP_RUNS_READ: persona.mode === "facility",
    SOP_RUNS_WRITE:
      persona.mode === "facility" && persona.subscriptionStatus === "active",
    TEAM_VIEW: persona.mode === "facility",
    TEAM_INVITE:
      persona.mode === "facility" &&
      persona.subscriptionStatus === "active" &&
      facilityManager,
    ROOMS_EQUIPMENT_STAFF: persona.mode === "facility"
  };
}

async function installRoleMocks(page: any, persona: Persona) {
  const token = `${persona.key}-token`;
  let paidCourseEnrolled = false;

  await page.addInitScript(
    ({ authToken, mode }) => {
      window.localStorage.clear();
      window.localStorage.setItem("auth_token_v1", authToken);
      window.localStorage.setItem("seenOnboardingCarousel", "true");
      window.localStorage.setItem("seenAppIntro", "true");
      window.localStorage.setItem("growpath_preferred_mode_v1", mode);
      window.global = window;
    },
    { authToken: token, mode: persona.mode }
  );

  const fulfillJson = (route: any, body: any, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body)
    });

  const me = {
    user: {
      id: persona.key,
      email: persona.email,
      displayName: persona.email.split("@")[0],
      plan: persona.requestedPlan,
      subscriptionStatus: persona.subscriptionStatus,
      growInterests:
        persona.mode === "personal"
          ? {
              crops: ["Cannabis"],
              environment: ["Indoor"],
              methods: ["Living Soil / No-Till"],
              experience: ["Intermediate"]
            }
          : {}
    },
    ctx: {
      mode: persona.mode,
      requestedPlan: persona.requestedPlan,
      plan: persona.requestedPlan,
      subscriptionStatus: persona.subscriptionStatus,
      facilityId: persona.mode === "facility" ? "facility-walkthrough-1" : null,
      facilityRole: persona.facilityRole || null,
      capabilities: capabilitiesFor(persona),
      limits: {
        maxGrows: activePlan(persona) === "free" ? 1 : 999,
        maxPlants: activePlan(persona) === "free" ? 1 : 999
      }
    }
  };

  await page.route("**/api/**", async (route: any) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname;

    if (method === "GET" && (path === "/api/me" || path === "/api/auth/me")) {
      return fulfillJson(route, me);
    }

    if (method === "POST" && path === "/api/auth/login") {
      return fulfillJson(route, { token, user: me.user });
    }

    if (method === "GET" && path === "/api/subscription/status") {
      return fulfillJson(route, {
        ok: true,
        configured: true,
        mode: "live",
        checkoutConfigured: true,
        webhookConfigured: true,
        pricesConfigured: {
          pro: { monthly: true, yearly: true },
          commercial: { monthly: true, yearly: true },
          facility: { monthly: true, yearly: true }
        }
      });
    }

    if (method === "GET" && path === "/api/personal/grows") {
      return fulfillJson(route, {
        grows: [
          {
            id: "grow-walkthrough-1",
            name: "Walkthrough Grow",
            status: "vegetating",
            growTags: ["Cannabis", "Indoor", "Living Soil / No-Till"],
            growInterests: {
              crops: ["Cannabis"],
              environment: ["Indoor"],
              methods: ["Living Soil / No-Till"]
            },
            updatedAt: "2026-07-10T00:00:00.000Z"
          }
        ]
      });
    }

    if (method === "GET" && path === "/api/personal/logs") {
      return fulfillJson(route, {
        logs: [
          {
            id: "log-walkthrough-1",
            growId: "grow-walkthrough-1",
            title: "Walkthrough photo log",
            notes: "Leaf check with photo.",
            photos: ["/uploads/walkthrough-leaf.jpg"],
            date: "2026-07-10",
            createdAt: "2026-07-10T00:00:00.000Z",
            updatedAt: "2026-07-10T00:00:00.000Z"
          }
        ]
      });
    }

    if (method === "GET" && path === "/api/personal/logs/log-walkthrough-1") {
      return fulfillJson(route, {
        log: {
          id: "log-walkthrough-1",
          growId: "grow-walkthrough-1",
          title: "Walkthrough photo log",
          notes: "Leaf check with photo.",
          photos: ["/uploads/walkthrough-leaf.jpg"],
          date: "2026-07-10",
          createdAt: "2026-07-10T00:00:00.000Z",
          updatedAt: "2026-07-10T00:00:00.000Z"
        }
      });
    }

    if (method === "GET" && path === "/api/personal/plants") {
      return fulfillJson(route, {
        plants: [
          { id: "plant-walkthrough-1", growId: "grow-walkthrough-1", name: "Plant A" }
        ]
      });
    }

    if (method === "GET" && path === "/api/personal/tasks") {
      return fulfillJson(route, {
        tasks: [{ id: "task-walkthrough-1", title: "Check canopy", completed: false }]
      });
    }

    if (method === "GET" && path === "/api/courses") {
      return fulfillJson(route, {
        courses: [
          {
            id: "course-published-1",
            title: "Indoor Living Soil Basics",
            summary: "A published course matched to this grower's interests.",
            status: "published",
            isPublished: true,
            priceCents: 0,
            growInterests: {
              crops: ["Cannabis"],
              environment: ["Indoor"],
              methods: ["Living Soil / No-Till"]
            },
            lessons: []
          },
          {
            id: "course-paid-buyer",
            userId: "another-course-creator",
            title: "Paid Indoor Course",
            summary: "A paid course used to verify checkout and lesson access.",
            status: "published",
            isPublished: true,
            priceCents: 2900,
            price: 29,
            access: "paid",
            growInterests: {
              crops: ["Cannabis"],
              environment: ["Indoor"]
            },
            lessons: [{ id: "paid-lesson-1", title: "Paid Lesson" }]
          }
        ]
      });
    }

    if (method === "GET" && path === "/api/courses/mine") {
      return fulfillJson(route, {
        courses: [
          {
            id: "course-new",
            title: "Recorded Course Draft",
            summary: "The draft remains visible after creation.",
            status: "draft",
            isPublished: false,
            priceCents: 1900,
            price: 19,
            access: "paid",
            growInterests: {
              crops: ["Cannabis"],
              environment: ["Indoor"]
            },
            lessons: []
          }
        ]
      });
    }

    if (
      method === "POST" &&
      (path === "/api/courses/create" || path === "/api/courses")
    ) {
      const body = request.postDataJSON();
      return fulfillJson(
        route,
        {
          id: "course-new",
          title: "Recorded Course Draft",
          summary: "The draft remains visible after creation.",
          status: "draft",
          priceCents: body?.priceCents || 0,
          price: body?.price || 0,
          access: body?.access || "free",
          growInterests: { crops: ["Cannabis"], environment: ["Indoor"] },
          lessons: []
        },
        201
      );
    }

    if (method === "GET" && path === "/api/courses/course-new") {
      return fulfillJson(route, {
        course: {
          id: "course-new",
          title: "Recorded Course Draft",
          summary: "The draft remains visible after creation.",
          status: "draft",
          priceCents: 1900,
          price: 19,
          access: "paid",
          growInterests: { crops: ["Cannabis"], environment: ["Indoor"] },
          lessons: []
        }
      });
    }

    if (method === "GET" && path === "/api/courses/course-paid-buyer") {
      return fulfillJson(route, {
        course: {
          id: "course-paid-buyer",
          userId: "another-course-creator",
          title: "Paid Indoor Course",
          summary: "A paid course used to verify checkout and lesson access.",
          status: "published",
          isPublished: true,
          priceCents: 2900,
          price: 29,
          access: "paid",
          growInterests: { crops: ["Cannabis"], environment: ["Indoor"] },
          lessons: [{ id: "paid-lesson-1", title: "Paid Lesson" }]
        }
      });
    }

    if (method === "GET" && path === "/api/courses/course-paid-buyer/enrollment-status") {
      return fulfillJson(route, {
        enrolled: paidCourseEnrolled,
        isEnrolled: paidCourseEnrolled,
        paymentStatus: paidCourseEnrolled ? "paid" : "not_started"
      });
    }

    if (method === "GET" && path === "/api/payments/course/course-paid-buyer/status") {
      return fulfillJson(route, {
        enrolled: paidCourseEnrolled,
        isEnrolled: paidCourseEnrolled,
        paymentStatus: paidCourseEnrolled ? "paid" : "not_started"
      });
    }

    if (method === "POST" && path === "/api/payments/checkout/course-paid-buyer") {
      paidCourseEnrolled = true;
      return fulfillJson(route, {
        url: "http://localhost:8095/home/personal/courses?courseId=course-paid-buyer&checkout=success"
      });
    }

    if (method === "PUT" && path === "/api/courses/course-new") {
      const body = request.postDataJSON();
      return fulfillJson(route, {
        course: {
          id: "course-new",
          title: "Recorded Course Draft",
          status: "draft",
          priceCents: body?.priceCents || 0,
          price: body?.price || 0,
          access: body?.access || "free",
          growInterests: { crops: ["Cannabis"], environment: ["Indoor"] },
          lessons: []
        }
      });
    }

    if (
      method === "GET" &&
      (path === "/api/courses/course-new/enrollment-status" ||
        path === "/api/courses/course-new/reviews")
    ) {
      return fulfillJson(route, { enrolled: false, reviews: [] });
    }

    if (method === "POST" && path === "/api/courses/course-new/lesson") {
      return fulfillJson(route, {
        course: {
          id: "course-new",
          title: "Recorded Course Draft",
          status: "draft",
          lessons: [{ id: "lesson-new", title: "Recorded Lesson" }]
        }
      });
    }

    if (method === "GET" && path === "/api/forum/feed/latest") {
      return fulfillJson(route, {
        posts: [
          {
            id: "forum-walkthrough-1",
            title: "Indoor leaf help",
            body: "The newest leaves are curling after the room warmed up.",
            author: { displayName: "Walkthrough Grower" },
            commentCount: 2,
            growId: "grow-walkthrough-1",
            growInterests: {
              crops: ["Cannabis"],
              environment: ["Indoor"],
              methods: ["Living Soil / No-Till"]
            },
            photos: ["/uploads/forum-missing-photo.jpg"],
            createdAt: "2026-07-12T00:00:00.000Z"
          },
          {
            id: "forum-orchard-1",
            title: "Orchard pruning notes",
            body: "A fruit tree discussion that should stay outside this interest feed.",
            growInterests: { crops: ["Fruit Trees"], environment: ["Outdoor"] }
          }
        ]
      });
    }

    if (
      method === "GET" &&
      (path === "/api/forum/forum-walkthrough-1" || path === "/api/forum/forum-created-1")
    ) {
      return fulfillJson(route, {
        post: {
          id: path.endsWith("forum-created-1")
            ? "forum-created-1"
            : "forum-walkthrough-1",
          title: path.endsWith("forum-created-1")
            ? "Recorded grow update"
            : "Indoor leaf help",
          body: "Shared from the Personal Pro walkthrough with grow context.",
          author: { displayName: "Walkthrough Grower" },
          growId: "grow-walkthrough-1",
          growInterests: {
            crops: ["Cannabis"],
            environment: ["Indoor"],
            methods: ["Living Soil / No-Till"]
          },
          photos: ["/uploads/forum-detail-missing.jpg"]
        }
      });
    }

    if (
      method === "GET" &&
      (path === "/api/forum/forum-walkthrough-1/comments" ||
        path === "/api/forum/forum-created-1/comments")
    ) {
      return fulfillJson(route, {
        comments: [
          {
            id: "comment-walkthrough-1",
            text: "Check the lights-off humidity window too.",
            author: { displayName: "Helpful Grower" },
            photos: ["/uploads/forum-comment-missing.jpg"]
          }
        ]
      });
    }

    if (method === "POST" && path === "/api/forum/create") {
      return fulfillJson(
        route,
        {
          post: {
            id: "forum-created-1",
            title: "Recorded grow update",
            growId: "grow-walkthrough-1"
          }
        },
        201
      );
    }

    if (method === "GET" && path === "/api/commercial/products") {
      return fulfillJson(route, {
        products: [
          {
            id: "product-walkthrough-1",
            name: "Walkthrough Soil",
            status: "draft",
            imageUrl: "/uploads/product-walkthrough.jpg",
            shortDescription: "Commercial product image route check.",
            price: 24,
            unitSize: "5 lb",
            growInterests: ["soil"],
            externalPurchaseUrl: "https://example.com"
          }
        ]
      });
    }

    if (method === "GET" && path === "/api/commercial/products/product-walkthrough-1") {
      return fulfillJson(route, {
        product: {
          id: "product-walkthrough-1",
          name: "Walkthrough Soil",
          status: "draft",
          imageUrl: "/uploads/product-walkthrough.jpg",
          shortDescription: "Commercial product image route check.",
          price: 24,
          unitSize: "5 lb",
          growInterests: ["soil"],
          externalPurchaseUrl: "https://example.com"
        }
      });
    }

    if (
      method === "GET" &&
      path === "/api/commercial/products/product-walkthrough-1/effectiveness"
    ) {
      return fulfillJson(route, {
        summary: { batchCount: 0, completedTrialCount: 0 },
        linked: { batches: [], trials: [], grows: [], courses: [] }
      });
    }

    if (method === "GET" && path === "/api/commercial/courses") {
      return fulfillJson(route, {
        courses: [
          {
            id: "course-walkthrough-1",
            title: "Walkthrough Course",
            description: "Commercial course thumbnail route check.",
            thumbnailUrl: "/uploads/course-walkthrough.jpg",
            bannerUrl: "/uploads/course-banner.jpg",
            growInterests: ["soil"],
            modules: [{ title: "Module 1" }],
            lessons: [{ title: "Lesson 1" }],
            access: "free",
            status: "draft"
          }
        ]
      });
    }

    if (method === "GET" && path === "/api/commercial/courses/course-walkthrough-1") {
      return fulfillJson(route, {
        course: {
          id: "course-walkthrough-1",
          title: "Walkthrough Course",
          description: "Commercial course thumbnail route check.",
          thumbnailUrl: "/uploads/course-walkthrough.jpg",
          bannerUrl: "/uploads/course-banner.jpg",
          category: "soil",
          growInterests: ["soil"],
          lessons: [{ title: "Lesson 1" }],
          access: "free",
          status: "draft"
        }
      });
    }

    if (method === "GET" && path === "/api/commercial/lives") {
      return fulfillJson(route, {
        lives: [
          {
            id: "live-walkthrough-1",
            title: "Walkthrough Live",
            description: "Live thumbnail route check.",
            thumbnailUrl: "/uploads/live-walkthrough.jpg",
            status: "scheduled",
            visibility: "public"
          }
        ]
      });
    }

    if (method === "GET" && path === "/api/commercial/product-lines") {
      return fulfillJson(route, {
        productLines: [{ id: "line-walkthrough-1", name: "Walkthrough Line" }]
      });
    }

    if (method === "GET" && path === "/api/commercial/campaigns") {
      return fulfillJson(route, {
        campaigns: [
          {
            id: "campaign-walkthrough-1",
            name: "Walkthrough Campaign",
            imageUrl: "/uploads/campaign-walkthrough.jpg",
            status: "draft"
          }
        ]
      });
    }

    if (method === "GET" && path === "/api/commercial/orders") {
      return fulfillJson(route, {
        orders: [
          {
            id: "transfer-walkthrough-1",
            facilityId: "facility-walkthrough-1",
            orderType: "licensed_cannabis_transfer",
            status: "approved",
            inventoryItemId: "inventory-walkthrough-1",
            itemName: "Cultivar lot 24-A",
            lotNumber: "LOT-24-A",
            quantity: 5,
            unit: "lb",
            unitPrice: 900,
            total: 4500,
            recipientName: "Licensed Example Dispensary",
            recipientLicense: "D-100",
            recipientState: "ME",
            manifestNumber: "MAN-24-A"
          }
        ]
      });
    }

    if (method === "GET" && path === "/api/facility/facility-walkthrough-1/inventory") {
      return fulfillJson(route, {
        items: [
          {
            id: "inventory-walkthrough-1",
            name: "Cultivar lot 24-A",
            sku: "LOT-24-A",
            lotNumber: "LOT-24-A",
            quantity: 20,
            unit: "lb"
          }
        ]
      });
    }

    if (
      method === "GET" &&
      (path === "/api/facilities" || path === "/api/facilities/mine")
    ) {
      return fulfillJson(route, {
        facilities: [
          {
            id: "facility-walkthrough-1",
            name: "Walkthrough Facility",
            role: persona.facilityRole || "MEMBER"
          }
        ]
      });
    }

    if (method === "GET" && path.startsWith("/api/facilit")) {
      return fulfillJson(route, { success: true, items: [], grows: [], tasks: [] });
    }

    if (method === "GET" && path === "/api/tools") {
      return fulfillJson(route, { tools: [] });
    }

    return fulfillJson(route, {
      success: true,
      items: [],
      logs: [],
      plants: [],
      tasks: []
    });
  });
}

async function expectNoNotFound(page: any) {
  await expect(page.getByText(/page not found|not found/i)).toHaveCount(0);
}

test.describe("role walkthrough matrix", () => {
  test("personal free sees browseable tools and locked AI", async ({ page }) => {
    await installRoleMocks(page, PERSONAS.personalFree);

    await page.goto("/home/personal/tools", { waitUntil: "domcontentloaded" });
    await expectNoNotFound(page);
    await expect(page.getByRole("heading", { name: "Tools / AI" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open personal Ask AI" })).toBeVisible();
    await expect(page.getByText("Plant Issue Diagnosis")).toBeVisible();
    await expect(page.getByText("VPD Calculator")).toBeVisible();
    await expect(page.getByText("Upgrade to unlock").first()).toBeVisible();

    await page.goto("/home/personal/logs/new?growId=grow-walkthrough-1&focus=photos", {
      waitUntil: "domcontentloaded"
    });
    await expectNoNotFound(page);
    await expect(page.getByLabel("Attach log photos")).toBeVisible();

    await page.goto("/courses/create?from=/home/personal/courses", {
      waitUntil: "domcontentloaded"
    });
    await expectNoNotFound(page);
    await expect(page.getByLabel("Set a paid course fee")).toBeEnabled();
    await page.getByLabel("Set a paid course fee").click();
    await page.getByLabel("Course price USD").fill("9.00");
    await expect(page.getByText("Learners will see: $9.00")).toBeVisible();
    await expect(page.getByText("Paid course limit: 1")).toBeVisible();
  });

  test("personal pro contextual workflow crawler", async ({ page }) => {
    await installRoleMocks(page, PERSONAS.personalPro);

    await page.goto("/home/personal/tools", { waitUntil: "domcontentloaded" });
    await expectNoNotFound(page);
    await expect(page.getByRole("link", { name: "Open personal Ask AI" })).toBeVisible();
    await expect(page.getByText("Ask grow questions")).toBeVisible();

    await page.goto("/home/personal/grows/new", { waitUntil: "domcontentloaded" });
    await expectNoNotFound(page);
    await expect(page.getByText("Grow Planner / Auto Calendar")).toBeVisible();
    await expect(page.getByLabel("Plant count")).toBeVisible();

    await page.goto("/home/personal/tasks", { waitUntil: "domcontentloaded" });
    await expectNoNotFound(page);
    await expect(page.getByText("Planning workflows")).toBeVisible();
    await expect(
      page.getByLabel("Watering Planner from personal_tasks_calendar")
    ).toBeVisible();
    await expect(
      page.getByLabel("Feeding Schedule from personal_tasks_calendar")
    ).toBeVisible();
    await expect(
      page.getByLabel("Timeline Planner from personal_tasks_calendar")
    ).toBeVisible();

    await page.goto("/home/personal/grows/grow-walkthrough-1", {
      waitUntil: "domcontentloaded"
    });
    await expectNoNotFound(page);
    await expect(page.getByText("Pheno / Genetics")).toBeVisible();
    await expect(page.getByText("Harvest / Diagnosis")).toBeVisible();

    await page.goto("/home/personal/grows/grow-walkthrough-1/timeline", {
      waitUntil: "domcontentloaded"
    });
    await expectNoNotFound(page);
    await expect(page.getByText("Timeline report")).toBeVisible();
    await expect(page.getByLabel("Export Grow Report from grow_timeline")).toBeVisible();

    await page.goto("/home/personal/logs/log-walkthrough-1", {
      waitUntil: "domcontentloaded"
    });
    await expectNoNotFound(page);
    await expect(page.getByText("Log report")).toBeVisible();

    await page.goto("/home/personal/ai", { waitUntil: "domcontentloaded" });
    await expectNoNotFound(page);
    await expect(page.getByText(/AI Assistant|Ask/i).first()).toBeVisible();

    await page.goto("/home/personal/diagnose", { waitUntil: "domcontentloaded" });
    await expectNoNotFound(page);
    await expect(page.getByText(/Add Photo|Change Photo/i).first()).toBeVisible();
    await expect(page.getByText("Harvest / maturity mode")).toBeVisible();

    await page.goto("/home/personal/logs/new?growId=grow-walkthrough-1&focus=photos", {
      waitUntil: "domcontentloaded"
    });
    await expectNoNotFound(page);
    await expect(page.getByLabel("Attach log photos")).toBeVisible();

    await page.goto("/home/personal/courses", { waitUntil: "domcontentloaded" });
    await expectNoNotFound(page);
    await expect(page.getByText("Indoor Living Soil Basics")).toBeVisible();
    await expect(page.getByText("Recorded Course Draft")).toBeVisible();
    await expect(page.getByText("Draft", { exact: true })).toBeVisible();

    await page.goto("/courses/create?from=/home/personal/courses", {
      waitUntil: "domcontentloaded"
    });
    await expectNoNotFound(page);
    await expect(page.getByText("Course grow interests")).toBeVisible();
    await page.getByLabel("Course title").fill("Recorded Course Draft");
    await page.getByLabel("Set a paid course fee").click();
    await page.getByLabel("Course price USD").fill("19.00");
    await expect(page.getByText("Learners will see: $19.00")).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByText("Create Draft").click();
    await expect(page).toHaveURL(/home\/personal\/courses(?:\?|$)/);
    await expect(page.getByText("Recorded Course Draft").first()).toBeVisible();
    await expect(page.getByLabel("Edit course price USD")).toHaveValue("19.00");
    await page.getByLabel("Edit course price USD").fill("24.00");
    await page.getByLabel("Save course fee").click();
    await expect(page.getByText("Course fee saved: $24.00.")).toBeVisible();
    await expect(page.getByText("Add Lesson")).toBeVisible();

    await page.getByText("Add Lesson").click();
    await expect(page).toHaveURL(/courses\/add-lesson\?courseId=course-new/);
    await expect(page.getByText("Add Lesson").first()).toBeVisible();
    await page.getByPlaceholder("Title").fill("Recorded Lesson");
    await page.getByText("Save Lesson").click();
    await expect(page).toHaveURL(/home\/personal\/courses/);

    await page.goto("/home/personal/courses?courseId=course-paid-buyer", {
      waitUntil: "domcontentloaded"
    });
    await expect(page.getByText("$29.00 | published")).toBeVisible();
    await expect(page.getByText("Start Checkout")).toBeVisible();
    await page.getByText("Start Checkout").click();
    await expect(page).toHaveURL(/courseId=course-paid-buyer&checkout=success/);
    await expect(
      page.getByText("Payment confirmed. This course is unlocked.")
    ).toBeVisible();
    await expect(page.getByText("Enrolled", { exact: true })).toBeVisible();
    await expect(page.getByText("Paid Lesson")).toBeVisible();

    await page.goto("/home/personal/forum", { waitUntil: "domcontentloaded" });
    await expectNoNotFound(page);
    await expect(page.getByText("Ask for Diagnosis Help")).toBeVisible();
    await expect(page.getByText("Share a Grow Update")).toBeVisible();
    await expect(page.getByText("Indoor leaf help")).toBeVisible();
    await expect(page.getByText("Orchard pruning notes")).toBeHidden();

    await page.getByLabel("Show all forum posts").click();
    await expect(page.getByText("Orchard pruning notes")).toBeVisible();
    await page.getByText("Indoor leaf help").click();
    await expect(page).toHaveURL(/forum\/post\/forum-walkthrough-1/);
    await expect(page.getByText("Attached grow: grow-walkthrough-1")).toBeVisible();
    await expect(page.getByLabel("Attach forum comment photos")).toBeVisible();
    await expect(
      page.getByText("Check the lights-off humidity window too.")
    ).toBeVisible();

    await page.goto(
      "/home/personal/forum/new-post?purpose=grow_update&growId=grow-walkthrough-1",
      { waitUntil: "domcontentloaded" }
    );
    await expect(page.getByText("Grow update", { exact: true })).toBeVisible();
    await page.getByLabel("Forum post title").fill("Recorded grow update");
    await page
      .getByLabel("Forum post body")
      .fill("A healthy canopy update shared directly from my active grow.");
    await page.getByLabel("Publish forum post").click();
    await expect(page).toHaveURL(/forum\/post\/forum-created-1/);
    await expect(page.getByText("Recorded grow update")).toBeVisible();
    await expect(page.getByText("Attached grow: grow-walkthrough-1")).toBeVisible();
  });

  test("commercial free keeps commercial shell but shows free plan constraints", async ({
    page
  }) => {
    await installRoleMocks(page, PERSONAS.commercialFree);

    await page.goto("/home/commercial", { waitUntil: "domcontentloaded" });
    await expectNoNotFound(page);
    await expect(page.getByText("Brand Dashboard")).toBeVisible();
    await expect(
      page.getByText(/commercial-free@example\.com \| free plan/i)
    ).toBeVisible();

    await page.goto("/home/commercial/products", { waitUntil: "domcontentloaded" });
    await expectNoNotFound(page);
    await expect(page.getByText("Products").first()).toBeVisible();
    await expect(page.getByLabel("Upload commercial product image")).toBeVisible();
  });

  test("commercial paid can reach product, course, and marketing media workflows", async ({
    page
  }) => {
    await installRoleMocks(page, PERSONAS.commercialPaid);

    await page.goto("/home/commercial/products", { waitUntil: "domcontentloaded" });
    await expectNoNotFound(page);
    await expect(page.getByLabel("Upload commercial product image")).toBeVisible();
    await expect(page.getByText("Walkthrough Soil")).toBeVisible();

    await page.goto("/home/commercial/products/product-walkthrough-1", {
      waitUntil: "domcontentloaded"
    });
    await expectNoNotFound(page);
    await expect(page.getByLabel("Upload commercial product detail image")).toBeVisible();
    await expect(
      page.getByLabel("Commercial product detail image preview")
    ).toBeVisible();

    await page.goto("/home/commercial/courses", { waitUntil: "domcontentloaded" });
    await expectNoNotFound(page);
    await expect(page.getByLabel("Upload commercial course thumbnail")).toBeVisible();
    await expect(page.getByLabel("Upload commercial course banner")).toBeVisible();
    await expect(page.getByText("Walkthrough Course")).toBeVisible();

    await page.goto("/home/commercial/courses/course-walkthrough-1", {
      waitUntil: "domcontentloaded"
    });
    await expectNoNotFound(page);
    await expect(
      page.getByLabel("Upload commercial course detail thumbnail")
    ).toBeVisible();
    await expect(page.getByLabel("Upload commercial course detail banner")).toBeVisible();
    await expect(
      page.getByLabel("Commercial course detail thumbnail preview")
    ).toBeVisible();
    await expect(
      page.getByLabel("Commercial course detail banner preview")
    ).toBeVisible();

    await page.goto("/home/commercial/lives", { waitUntil: "domcontentloaded" });
    await expectNoNotFound(page);
    await expect(page.getByLabel("Upload commercial live thumbnail")).toBeVisible();
    await expect(page.getByText("Walkthrough Live")).toBeVisible();

    await page.goto("/home/commercial/marketing", { waitUntil: "domcontentloaded" });
    await expectNoNotFound(page);
    await expect(page.getByLabel("Upload marketing plan ad image")).toBeVisible();
  });

  test("commercial paid routes stay inside the commercial workspace", async ({
    page
  }) => {
    await installRoleMocks(page, PERSONAS.commercialPaid);

    const routes = [
      "/home/commercial",
      "/home/commercial/storefront",
      "/home/commercial/products",
      "/home/commercial/courses",
      "/home/commercial/lives",
      "/home/commercial/feed",
      "/home/commercial/orders",
      "/home/commercial/analytics",
      "/home/commercial/profile",
      "/home/commercial/batch-planner",
      "/home/commercial/product-lines",
      "/home/commercial/trials",
      "/home/commercial/community",
      "/home/commercial/marketing",
      "/home/commercial/inventory",
      "/home/commercial/evidence-runs",
      "/home/commercial/tasks",
      "/home/commercial/tools/ask-ai?growId=grow-walkthrough-1",
      "/home/commercial/tools/diagnose?growId=grow-walkthrough-1",
      "/home/commercial/tools/environment?growId=grow-walkthrough-1",
      "/home/commercial/tools/recipe-builder?growId=grow-walkthrough-1",
      "/home/commercial/tools/harvest-readiness?growId=grow-walkthrough-1",
      "/home/commercial/tools/report?growId=grow-walkthrough-1"
    ];

    for (const route of routes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expectNoNotFound(page);
      const pathname = route.split("?")[0];
      await expect(page).toHaveURL(
        new RegExp(`${pathname.replaceAll("/", "\\/")}(?:[/?#]|$)`)
      );
      await expect(page.getByText("Commercial workflow")).toHaveCount(0);
    }
  });

  test("facility free reaches facility shell and AI entry without paid write controls", async ({
    page
  }) => {
    await installRoleMocks(page, PERSONAS.facilityFree);

    await page.goto("/home/facility", { waitUntil: "domcontentloaded" });
    await expectNoNotFound(page);
    await expect(page.getByText("Operations Live")).toBeVisible();
    await expect(page.getByText("facility-walkthrough-1")).toBeVisible();

    await page.goto("/home/facility/ai-tools", { waitUntil: "domcontentloaded" });
    await expectNoNotFound(page);
    await expect(page.getByText("Facility AI")).toBeVisible();
    await expect(page.getByText("AI usage")).toBeVisible();
  });

  test("facility paid reaches compliance and Ask AI workflow surfaces", async ({
    page
  }) => {
    await installRoleMocks(page, PERSONAS.facilityPaid);

    await page.goto("/home/facility/ai-ask", { waitUntil: "domcontentloaded" });
    await expectNoNotFound(page);
    await expect(page.getByText("Facility AI")).toBeVisible();

    await page.goto("/home/facility/compliance", { waitUntil: "domcontentloaded" });
    await expectNoNotFound(page);
    await expect(page.getByText(/Compliance/i).first()).toBeVisible();
  });

  test("facility paid routes stay inside the facility workspace", async ({ page }) => {
    await installRoleMocks(page, PERSONAS.facilityPaid);

    const routes = [
      "/home/facility/dashboard",
      "/home/facility/rooms",
      "/home/facility/grows",
      "/home/facility/plants",
      "/home/facility/logs",
      "/home/facility/inventory",
      "/home/facility/transfers",
      "/home/facility/tasks",
      "/home/facility/sop-runs",
      "/home/facility/compliance",
      "/home/facility/audit-logs",
      "/home/facility/team",
      "/home/facility/reports",
      "/home/facility/integrations",
      "/home/facility/profile",
      "/home/facility/ai-ask",
      "/home/facility/ai-template",
      "/home/facility/ai-validation",
      "/home/facility/ai-diagnosis-photo"
    ];

    for (const route of routes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expectNoNotFound(page);
      await expect(page).toHaveURL(
        new RegExp(`${route.replaceAll("/", "\\/")}(?:[/?#]|$)`)
      );
      await expect(page.getByText("Paid facility workflow")).toHaveCount(0);
    }
  });

  test("facility staff and viewer keep role-appropriate operations and community access", async ({
    page
  }) => {
    for (const persona of [PERSONAS.facilityStaff, PERSONAS.facilityViewer]) {
      await installRoleMocks(page, persona);
      for (const route of [
        "/home/facility/dashboard",
        "/home/facility/grows",
        "/home/facility/plants",
        "/home/facility/logs",
        "/home/facility/integrations",
        "/home/facility/feed",
        "/forum",
        "/courses"
      ]) {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await expectNoNotFound(page);
      }
    }
  });

  test("facility licensed sales use transfer records instead of public checkout", async ({
    page
  }) => {
    await installRoleMocks(page, PERSONAS.facilityPaid);
    await page.goto("/home/facility/transfers", { waitUntil: "domcontentloaded" });
    await expectNoNotFound(page);
    await expect(page.getByText("Licensed sales & transfers")).toBeVisible();
    await expect(page.getByText(/no public cannabis checkout/i)).toBeVisible();
    await expect(page.getByText("Licensed Example Dispensary")).toBeVisible();
    await expect(page.getByText("$4,500.00").first()).toBeVisible();
    await expect(page.getByText("Mark shipped & deduct inventory")).toBeVisible();
  });

  test("facility viewer sees licensed transfers read only", async ({ page }) => {
    await installRoleMocks(page, PERSONAS.facilityViewer);
    await page.goto("/home/facility/transfers?facilityRole=VIEWER", {
      waitUntil: "domcontentloaded"
    });
    await expect(page.getByText(/viewer role can view shipment records/i)).toBeVisible();
    await expect(page.getByText("New licensed transfer")).toHaveCount(0);
  });
});
