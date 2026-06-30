import { expect, test } from "@playwright/test";

const USER = {
  id: "core-loop-user",
  email: "core-loop@example.com",
  plan: "pro"
};

function fulfillJson(route: any, body: any, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

function rowId(row: any) {
  return String(row?._id || row?.id || "");
}

async function installCoreLoopMocks(page: any) {
  const state = {
    grows: [] as any[],
    plants: [] as any[],
    logs: [] as any[],
    tasks: [] as any[],
    toolRuns: [] as any[]
  };

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
    window.localStorage.setItem("auth_token_v1", "core-loop-token");
    window.localStorage.setItem("seenOnboardingCarousel", "true");
    window.localStorage.setItem("seenAppIntro", "true");
    window.global = window;
  });

  function timeline(growId: string) {
    const events: any[] = [];
    for (const grow of state.grows.filter((row) => row.id === growId)) {
      events.push({
        id: `timeline-grow-${grow.id}`,
        growId,
        type: "grow_created",
        sourceModel: "Grow",
        sourceId: grow.id,
        title: `${grow.name} created`,
        summary: "Grow workspace was created.",
        timestamp: grow.createdAt,
        tags: ["grow"]
      });
    }
    for (const plant of state.plants.filter((row) => row.growId === growId)) {
      events.push({
        id: `timeline-plant-${plant.id}`,
        growId,
        plantId: plant.id,
        type: "plant_added",
        sourceModel: "Plant",
        sourceId: plant.id,
        title: `${plant.name} added`,
        summary: `${plant.cropCommonName} (${plant.scientificName})`,
        timestamp: plant.createdAt,
        tags: ["plant", plant.cropCommonName]
      });
    }
    for (const log of state.logs.filter((row) => row.growId === growId)) {
      events.push({
        id: `timeline-log-${log.id}`,
        growId,
        plantId: log.plantId,
        type: "log_created",
        sourceModel: "GrowLog",
        sourceId: log.id,
        title: log.title,
        summary: log.notes,
        timestamp: log.createdAt,
        tags: log.tags || [],
        payload: {
          photoCount: log.photos?.length || 0,
          photoMetadata: log.photoMetadata || []
        }
      });
      for (const [index, photo] of (log.photos || []).entries()) {
        events.push({
          id: `timeline-photo-${log.id}-${index}`,
          growId,
          plantId: log.plantId,
          type: "photo_added",
          sourceModel: "GrowLog",
          sourceId: log.id,
          title: "Photo attached to log",
          summary: photo,
          timestamp: log.createdAt,
          tags: ["photo"],
          payload: log.photoMetadata?.[index] || {}
        });
      }
    }
    for (const run of state.toolRuns.filter((row) => row.growId === growId)) {
      events.push({
        id: `timeline-tool-${rowId(run)}`,
        growId,
        plantId: run.plantId,
        type: "tool_run_created",
        sourceModel: "ToolRun",
        sourceId: rowId(run),
        title: `${run.toolType} result saved`,
        summary: run.summary || "Tool run saved to the grow.",
        timestamp: run.createdAt,
        tags: ["tool", run.toolType],
        payload: run.outputs
      });
    }
    for (const task of state.tasks.filter((row) => row.growId === growId)) {
      events.push({
        id: `timeline-task-${task.id}`,
        growId,
        plantId: task.plantId,
        type: "task_created",
        sourceModel: "Task",
        sourceId: task.id,
        title: task.title,
        summary: task.description,
        timestamp: task.createdAt,
        tags: ["task", task.sourceType || ""].filter(Boolean)
      });
    }
    return events.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  await page.route("**/api/**", async (route: any) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (
      method === "GET" &&
      (url.pathname === "/api/me" || url.pathname === "/api/auth/me")
    ) {
      return fulfillJson(route, {
        user: USER,
        ctx: {
          mode: "personal",
          plan: "pro",
          subscriptionStatus: "active",
          facilityId: null,
          facilityRole: null,
          capabilities: {
            GROWS_PERSONAL_VIEW: true,
            GROWS_PERSONAL_WRITE: true,
            LOGS_PERSONAL_VIEW: true,
            LOGS_PERSONAL_WRITE: true,
            PLANTS_PERSONAL_VIEW: true,
            PLANTS_PERSONAL_WRITE: true,
            TOOLS_VPD: true,
            DIAGNOSE_AI: true
          },
          limits: {}
        }
      });
    }

    if (method === "GET" && url.pathname === "/api/personal/grows") {
      return fulfillJson(route, { grows: state.grows });
    }

    if (method === "POST" && url.pathname === "/api/personal/grows") {
      const payload = request.postDataJSON();
      const grow = {
        id: "grow-core-loop-1",
        _id: "grow-core-loop-1",
        name: payload.name,
        status: "vegetating",
        strain: payload.cultivar || "",
        location: payload.systemPreset,
        startDate: payload.anchorDate,
        updatedAt: "2026-06-30T16:00:00.000Z",
        createdAt: "2026-06-30T16:00:00.000Z"
      };
      state.grows = [grow];
      return fulfillJson(route, { success: true, grow, created: grow }, 201);
    }

    const timelineMatch = url.pathname.match(
      /^\/api\/personal\/grows\/([^/]+)\/timeline$/
    );
    if (method === "GET" && timelineMatch) {
      return fulfillJson(route, {
        timeline: timeline(decodeURIComponent(timelineMatch[1]))
      });
    }

    if (method === "GET" && url.pathname === "/api/personal/plants") {
      const growId = url.searchParams.get("growId");
      const rows = growId
        ? state.plants.filter((plant) => plant.growId === growId)
        : state.plants;
      return fulfillJson(route, { plants: rows });
    }

    if (method === "POST" && url.pathname === "/api/personal/plants") {
      const payload = request.postDataJSON();
      const plant = {
        id: "plant-core-blueberry-1",
        _id: "plant-core-blueberry-1",
        ...payload,
        stage: payload.stage || "seedling",
        cultivar: payload.cultivar || payload.strain,
        growthProfile: {
          cropProfile: payload.cropProfileId || null,
          confirmationStatus: payload.confirmationStatus || "needs_confirmation",
          sizeMetrics: payload.sizeMetrics || {},
          timingAdjustments: payload.timingAdjustments || {},
          waterUseProfile: payload.waterUseProfile || {},
          phenoLabel: payload.phenoLabel || ""
        },
        createdAt: "2026-06-30T16:05:00.000Z",
        updatedAt: "2026-06-30T16:05:00.000Z"
      };
      state.plants = [plant];
      return fulfillJson(route, { plant, created: plant }, 201);
    }

    if (method === "GET" && url.pathname === "/api/personal/logs") {
      const growId = url.searchParams.get("growId");
      const rows = growId
        ? state.logs.filter((log) => log.growId === growId)
        : state.logs;
      return fulfillJson(route, { logs: rows });
    }

    if (method === "POST" && url.pathname === "/api/personal/logs") {
      const payload = request.postDataJSON();
      const log = {
        id: `log-core-${state.logs.length + 1}`,
        _id: `log-core-${state.logs.length + 1}`,
        createdAt: "2026-06-30T16:10:00.000Z",
        updatedAt: "2026-06-30T16:10:00.000Z",
        ...payload
      };
      state.logs = [log, ...state.logs];
      return fulfillJson(route, { log, created: log }, 201);
    }

    if (method === "GET" && url.pathname === "/api/tools") {
      const growId = url.searchParams.get("growId");
      const rows = growId
        ? state.toolRuns.filter((run) => run.growId === growId)
        : state.toolRuns;
      return fulfillJson(route, { tools: rows });
    }

    if (method === "POST" && url.pathname === "/api/tools/vpd") {
      const payload = request.postDataJSON();
      const toolRun = {
        id: "toolrun-core-vpd-1",
        _id: "toolrun-core-vpd-1",
        growId: payload.growId,
        plantId: payload.plantId,
        cropProfileId: payload.cropProfileId || null,
        toolType: "vpd",
        toolName: "vpd",
        inputs: payload,
        outputs: {
          vpdKpa: 0.91,
          status: "in_range",
          target: { min: 0.8, max: 1.1 },
          leafTempC: 22.8
        },
        warnings: [],
        recommendations: ["Keep blueberry media evenly moist while confirming pH."],
        selectedPlantContext: payload.selectedPlantContext,
        plantGrowthProfile: payload.plantGrowthProfile,
        summary: "VPD was saved with selected blueberry plant context.",
        confidence: "server-calculated",
        formulas: ["VPD = SVP leaf - actual vapor pressure."],
        createdAt: "2026-06-30T16:15:00.000Z"
      };
      state.toolRuns = [toolRun];
      return fulfillJson(route, { toolRun, outputs: toolRun.outputs });
    }

    const createTaskMatch = url.pathname.match(
      /^\/api\/tools\/runs\/([^/]+)\/create-task$/
    );
    if (method === "POST" && createTaskMatch) {
      const toolRunId = decodeURIComponent(createTaskMatch[1]);
      const run = state.toolRuns.find((item) => rowId(item) === toolRunId);
      const payload = request.postDataJSON();
      const task = {
        id: "task-core-vpd-1",
        _id: "task-core-vpd-1",
        growId: run?.growId,
        plantId: run?.plantId,
        title: payload.title || "Follow up: vpd",
        description:
          payload.description || "Review VPD result and confirm blueberry transpiration.",
        completed: false,
        priority: payload.priority || "medium",
        sourceType: "tool_run",
        sourceToolRunId: toolRunId,
        sourceObjectId: toolRunId,
        createdAt: "2026-06-30T16:20:00.000Z",
        dueDate: "2026-06-30T18:00:00.000Z"
      };
      state.tasks = [task];
      return fulfillJson(route, { task, created: task }, 201);
    }

    if (method === "GET" && url.pathname === "/api/personal/tasks") {
      const growId = url.searchParams.get("growId");
      const rows = growId
        ? state.tasks.filter((task) => task.growId === growId)
        : state.tasks;
      return fulfillJson(route, { tasks: rows });
    }

    return fulfillJson(route, { ok: true });
  });

  return state;
}

test("personal grow core loop persists and reappears in timeline", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  const state = await installCoreLoopMocks(page);

  await page.goto("/home/personal/grows/new", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "New Grow" })).toBeVisible();
  await page.getByLabel("Grow name").fill("Blueberry Patio Release Loop");
  await page.getByLabel("Anchor date").fill("2026-06-01");
  await page.getByLabel("Create grow").click();

  await expect.poll(() => state.grows.length, { message: "grow was created" }).toBe(1);

  await page.goto("/home/personal/grows/grow-core-loop-1/plants", {
    waitUntil: "domcontentloaded"
  });
  await page.getByLabel("Add plant").click();
  await page.getByLabel("Plant name").fill("Blueberry patio bush");
  await page.getByLabel("Cultivar or strain").fill("Bluecrop");
  await page.getByLabel("Plant crop common name").fill("Blueberry");
  await page.getByLabel("Plant scientific name").fill("Vaccinium corymbosum");
  await page.getByLabel("Plant medium").fill("peat/perlite");
  await page.getByLabel("Plant canopy width").fill("95");
  await page.getByLabel("Plant timing offset").fill("-5");
  await page.getByLabel("Plant water demand").fill("medium");
  await page.getByLabel("Plant pheno label").fill("compact fruiting");
  await page.getByLabel("Add plant to grow").click();

  await expect
    .poll(() => state.plants[0], { message: "plant was created with crop context" })
    .toEqual(
      expect.objectContaining({
        growId: "grow-core-loop-1",
        name: "Blueberry patio bush",
        cropCommonName: "Blueberry",
        scientificName: "Vaccinium corymbosum",
        growthProfile: expect.objectContaining({
          sizeMetrics: { canopyWidthCm: 95 },
          timingAdjustments: { stageDaysOffset: -5 },
          waterUseProfile: { observedDemand: "medium" },
          phenoLabel: "compact fruiting"
        })
      })
    );

  await page.goto(
    "/home/personal/logs/new?growId=grow-core-loop-1&plantId=plant-core-blueberry-1",
    { waitUntil: "domcontentloaded" }
  );
  await expect(page.getByRole("heading", { name: "New Journal Entry" })).toBeVisible();
  await expect(
    page.getByText("Blueberry | Bluecrop | pheno: compact fruiting")
  ).toBeVisible();
  await page.getByLabel("Log title").fill("Blueberry leaf photo check");
  await page.getByLabel("Log notes").fill("Attached leaf photo before VPD review.");
  await page
    .getByRole("textbox", { name: "Photo URL" })
    .fill("/uploads/e2e-blueberry-leaf.jpg");
  await page.getByLabel("Add photo URL").click();
  await expect(page.getByText("Remove")).toBeVisible();
  await page.getByLabel("Create log").click();

  await expect
    .poll(() => state.logs[0], { message: "log was created with photo metadata" })
    .toEqual(
      expect.objectContaining({
        growId: "grow-core-loop-1",
        plantId: "plant-core-blueberry-1",
        title: "Blueberry leaf photo check",
        photos: ["/uploads/e2e-blueberry-leaf.jpg"],
        photoMetadata: [
          expect.objectContaining({
            growId: "grow-core-loop-1",
            plantId: "plant-core-blueberry-1",
            url: "/uploads/e2e-blueberry-leaf.jpg",
            consentForTraining: false
          })
        ]
      })
    );

  await page.goto(
    "/home/personal/tools/vpd?growId=grow-core-loop-1&plantId=plant-core-blueberry-1",
    { waitUntil: "domcontentloaded" }
  );
  await expect(page.getByRole("heading", { name: "VPD Calculator" })).toBeVisible();
  await page.getByLabel("Calculate and Save").click();
  await expect(page.getByText("Calculated and saved.")).toBeVisible();
  await page.getByLabel("Create Task").click();
  await expect(page.getByText("Follow-up task created.")).toBeVisible();

  await expect
    .poll(() => state.toolRuns[0], { message: "tool run saved selected plant context" })
    .toEqual(
      expect.objectContaining({
        growId: "grow-core-loop-1",
        plantId: "plant-core-blueberry-1",
        cropProfileId: null,
        selectedPlantContext: expect.objectContaining({
          cropCommonName: "Blueberry",
          scientificName: "Vaccinium corymbosum",
          growthProfile: expect.objectContaining({
            phenoLabel: "compact fruiting"
          })
        })
      })
    );

  await expect
    .poll(() => state.tasks[0], { message: "task was created from tool run" })
    .toEqual(
      expect.objectContaining({
        growId: "grow-core-loop-1",
        plantId: "plant-core-blueberry-1",
        sourceType: "tool_run",
        sourceToolRunId: "toolrun-core-vpd-1"
      })
    );

  await page.goto("/home/personal", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Today's tasks")).toBeVisible();
  await expect(page.getByText("Follow up: vpd")).toBeVisible();
  await expect(page.getByText(/Source: tool run/)).toBeVisible();
  await expect(page.getByText("Open Source")).toBeVisible();

  await page.goto("/home/personal/grows/grow-core-loop-1/timeline", {
    waitUntil: "domcontentloaded"
  });
  await expect(page.getByText("Blueberry Patio Release Loop created")).toBeVisible();
  await expect(page.getByText("Blueberry patio bush added")).toBeVisible();
  await expect(page.getByText("Blueberry leaf photo check")).toBeVisible();
  await expect(page.getByText("Photo attached to log")).toBeVisible();
  await expect(page.getByText("vpd result saved")).toBeVisible();
  await expect(page.getByText("Follow up: vpd")).toBeVisible();
  await expect(page.getByText("Open Journal Source").first()).toBeVisible();
  await expect(page.getByText("Open Tool Source")).toBeVisible();
  await expect(page.getByText("Open Task Source")).toBeVisible();

  await page.screenshot({
    path: "tmp/screenshots/personal-core-loop-timeline-mobile.png",
    fullPage: true
  });
});
