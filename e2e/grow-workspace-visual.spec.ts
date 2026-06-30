import { expect, test } from "@playwright/test";

const GROW = {
  id: "grow-workspace-audit-1",
  name: "Release Loop Mixed Crop",
  status: "flowering",
  updatedAt: "2026-06-30T15:30:00.000Z"
};

const PLANT = {
  id: "plant-blueberry-1",
  growId: GROW.id,
  name: "Blueberry patio bush",
  cropCommonName: "Blueberry",
  scientificName: "Vaccinium corymbosum",
  cultivar: "Bluecrop",
  cropProfileId: "crop-blueberry-1",
  stage: "fruiting",
  medium: "peat/perlite",
  growthProfile: {
    sizeMetrics: { canopyWidthCm: 95 },
    timingAdjustments: { stageDaysOffset: -5 },
    waterUseProfile: { observedDemand: "medium" },
    phenoLabel: "compact fruiting"
  }
};

const LOG = {
  id: "log-workspace-1",
  growId: GROW.id,
  plantId: PLANT.id,
  type: "diagnosis",
  date: "2026-06-30T12:00:00.000Z",
  title: "Leaf edge check",
  notes: "Checked for salt stress after a diagnosis follow-up.",
  tags: ["blueberry", "leaf edge", "follow up"],
  createdAt: "2026-06-30T12:00:00.000Z",
  updatedAt: "2026-06-30T12:00:00.000Z"
};

const TASK = {
  id: "task-workspace-1",
  growId: GROW.id,
  plantId: PLANT.id,
  title: "Check media pH before next feed",
  description: "Blueberries need acidic media; verify before changing nutrients.",
  dueDate: "2026-07-01T09:00:00.000Z",
  completed: false,
  priority: "high",
  sourceType: "ai_diagnosis",
  sourceDiagnosisId: "diagnosis-workspace-1",
  createdAt: "2026-06-30T12:10:00.000Z"
};

const TOOL_RUNS = [
  {
    _id: "toolrun-workspace-1",
    id: "toolrun-workspace-1",
    growId: GROW.id,
    plantId: PLANT.id,
    cropProfileId: PLANT.cropProfileId,
    toolType: "vpd",
    toolName: "vpd",
    createdAt: "2026-06-30T13:00:00.000Z",
    inputs: { tempF: 74, rh: 68, leafTempF: 72 },
    outputs: { vpdKpa: 0.88, status: "watch" },
    warnings: ["Blueberry transpiration targets differ from cannabis defaults."],
    recommendations: ["Keep media moisture steady while confirming crop profile."],
    selectedPlantContext: {
      id: PLANT.id,
      name: PLANT.name,
      cropCommonName: PLANT.cropCommonName,
      scientificName: PLANT.scientificName,
      cultivarOrStrain: PLANT.cultivar,
      cropProfileId: PLANT.cropProfileId,
      growthProfile: PLANT.growthProfile
    }
  },
  {
    _id: "toolrun-workspace-2",
    id: "toolrun-workspace-2",
    growId: GROW.id,
    plantId: PLANT.id,
    cropProfileId: PLANT.cropProfileId,
    toolType: "watering",
    toolName: "watering",
    createdAt: "2026-06-29T13:00:00.000Z",
    inputs: { containerGallons: 7 },
    outputs: { suggestedVolumeMl: 850 }
  }
];

const POLICIES = [
  {
    id: "policy-workspace-1",
    _id: "policy-workspace-1",
    growId: GROW.id,
    name: "AI Diagnosis Follow-Up",
    description: "Create a follow-up task when AI diagnosis reports a concern.",
    enabled: true,
    trigger: { source: "ai_diagnosis", eventType: "ai_issue_detected" },
    conditions: [{ field: "overallHealth", operator: "not_equals", value: "good" }],
    actions: [{ type: "create_task", payload: { title: "Follow up" } }],
    lastTriggeredAt: "2026-06-30T12:10:00.000Z",
    triggerCount: 1,
    createdAt: "2026-06-30T10:00:00.000Z",
    updatedAt: "2026-06-30T12:10:00.000Z"
  }
];

const AUTOMATION_EVENTS = [
  {
    id: "event-workspace-1",
    _id: "event-workspace-1",
    growId: GROW.id,
    plantId: PLANT.id,
    source: "ai_diagnosis",
    eventType: "ai_issue_detected",
    payload: { overallHealth: "watch" },
    processed: true,
    matchedPolicyIds: ["policy-workspace-1"],
    errors: [],
    createdAt: "2026-06-30T12:10:00.000Z"
  }
];

const TIMELINE = [
  {
    id: "timeline-diagnosis-1",
    growId: GROW.id,
    plantId: PLANT.id,
    type: "diagnosis_created",
    sourceModel: "Diagnosis",
    sourceId: "diagnosis-workspace-1",
    title: "Blueberry diagnosis saved",
    summary: "AI triage flagged media pH and salt stress next checks.",
    timestamp: "2026-06-30T12:05:00.000Z",
    tags: ["blueberry", "diagnosis"],
    payload: { overallHealth: "watch", feedbackCount: 1 }
  },
  {
    id: "timeline-tool-1",
    growId: GROW.id,
    plantId: PLANT.id,
    type: "tool_run_created",
    sourceModel: "ToolRun",
    sourceId: "toolrun-workspace-1",
    title: "VPD result saved",
    summary: "VPD run saved with blueberry plant context.",
    timestamp: "2026-06-30T13:00:00.000Z",
    tags: ["tool", "vpd"]
  },
  {
    id: "timeline-task-1",
    growId: GROW.id,
    plantId: PLANT.id,
    type: "task_created",
    sourceModel: "Task",
    sourceId: TASK.id,
    title: TASK.title,
    summary: TASK.description,
    timestamp: TASK.createdAt,
    tags: ["task", "ai_diagnosis"]
  },
  {
    id: "timeline-automation-1",
    growId: GROW.id,
    plantId: PLANT.id,
    type: "automation_event",
    sourceModel: "AutomationEvent",
    sourceId: "event-workspace-1",
    title: "Automation matched AI follow-up",
    summary: "Policy created a task from diagnosis concern.",
    timestamp: "2026-06-30T12:10:00.000Z",
    tags: ["automation"]
  }
];

function fulfillJson(route: any, body: any, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

async function installMocks(page: any) {
  page.on("console", (message: any) => {
    const type = message.type();
    if (type === "error" || type === "warning") {
      console.log(`[browser:${type}] ${message.text()}`);
    }
  });
  page.on("pageerror", (error: Error) => {
    console.log(`[pageerror] ${error.message}`);
  });

  await page.addInitScript(() => {
    window.localStorage.setItem("auth_token_v1", "grow-workspace-token");
    window.localStorage.setItem("seenOnboardingCarousel", "true");
    window.localStorage.setItem("seenAppIntro", "true");
    window.global = window;
  });

  await page.route("**/api/**", async (route: any) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (
      method === "GET" &&
      (url.pathname === "/api/me" || url.pathname === "/api/auth/me")
    ) {
      return fulfillJson(route, {
        user: {
          id: "workspace-user",
          email: "workspace@example.com",
          plan: "pro"
        },
        ctx: {
          mode: "personal",
          plan: "pro",
          subscriptionStatus: "active",
          capabilities: {
            GROWS_PERSONAL_VIEW: true,
            GROWS_PERSONAL_WRITE: true,
            LOGS_PERSONAL_VIEW: true,
            LOGS_PERSONAL_WRITE: true,
            PLANTS_PERSONAL_VIEW: true,
            DIAGNOSE_AI: true,
            TOOL_TIMELINE_PLANNER: true
          },
          limits: {}
        }
      });
    }

    if (method === "GET" && url.pathname === "/api/personal/grows") {
      return fulfillJson(route, { grows: [GROW] });
    }

    if (method === "GET" && url.pathname === `/api/personal/grows/${GROW.id}/timeline`) {
      return fulfillJson(route, { timeline: TIMELINE });
    }

    if (method === "GET" && url.pathname === "/api/personal/logs") {
      return fulfillJson(route, { logs: [LOG] });
    }

    if (method === "GET" && url.pathname === "/api/personal/tasks") {
      return fulfillJson(route, { tasks: [TASK] });
    }

    if (method === "GET" && url.pathname === "/api/personal/plants") {
      return fulfillJson(route, { plants: [PLANT] });
    }

    if (method === "GET" && url.pathname === "/api/tools") {
      return fulfillJson(route, { tools: TOOL_RUNS });
    }

    if (method === "GET" && url.pathname === "/api/automation/policies") {
      return fulfillJson(route, { policies: POLICIES });
    }

    if (method === "GET" && url.pathname === "/api/automation/events") {
      return fulfillJson(route, { events: AUTOMATION_EVENTS });
    }

    return fulfillJson(route, { ok: true });
  });
}

test.describe("grow workspace visual audit", () => {
  for (const size of [
    { name: "desktop", width: 1280, height: 1100 },
    { name: "mobile", width: 390, height: 1000 }
  ]) {
    test(`release-critical grow workspace tabs render on ${size.name}`, async ({
      page
    }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await installMocks(page);

      const base = `/home/personal/grows/${GROW.id}`;
      const checks = [
        {
          path: base,
          title: "Release Loop Mixed Crop",
          evidence: ["Journal", "Tasks", "Tool Runs", "Recent timeline"],
          shot: "overview"
        },
        {
          path: `${base}/plants`,
          title: "Plants",
          evidence: [
            "Blueberry patio bush",
            "Species: Blueberry (Vaccinium corymbosum)",
            "Growth overlay: canopy 95 cm - water medium - timing -5d - pheno compact fruiting"
          ],
          shot: "plants"
        },
        {
          path: `${base}/journal`,
          title: "Journal",
          evidence: ["Leaf edge check", "vpd", "Check media pH before next feed"],
          shot: "journal"
        },
        {
          path: `${base}/tasks`,
          title: "Tasks",
          evidence: ["Check media pH before next feed", "Source: ai diagnosis", "Snooze"],
          shot: "tasks"
        },
        {
          path: `${base}/tools`,
          title: "Grow Tools",
          evidence: ["vpd | 2026-06-30", "Blueberry patio bush | Blueberry | Bluecrop"],
          shot: "tools"
        },
        {
          path: `${base}/automation`,
          title: "Grow Automation",
          evidence: [
            "AI Diagnosis Follow-Up",
            "Recent Automation Events",
            "ai diagnosis:ai issue detected"
          ],
          shot: "automation"
        },
        {
          path: `${base}/timeline`,
          title: "Grow Timeline",
          evidence: [
            "Blueberry diagnosis saved",
            "VPD result saved",
            "Automation matched AI follow-up"
          ],
          shot: "timeline"
        },
        {
          path: `${base}/compare`,
          title: "Compare",
          evidence: ["Latest", "Previous", "vpd"],
          shot: "compare"
        }
      ];

      for (const check of checks) {
        await page.goto(check.path, { waitUntil: "domcontentloaded" });
        await expect(page.getByText(check.title).first()).toBeVisible();
        for (const text of check.evidence) {
          await expect(page.getByText(text).first()).toBeVisible();
        }
        await page.screenshot({
          path: `tmp/screenshots/grow-workspace-${check.shot}-${size.name}.png`,
          fullPage: true
        });
      }
    });
  }
});
