import { expect, test } from "@playwright/test";

const GROW_ID = "grow-etgu-1";

function fulfillJson(route: any, body: any, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

async function installMocks(page: any) {
  const diagnosisPayloads: any[] = [];
  const savedLogs: any[] = [];
  const savedTasks: any[] = [];
  const savedFeedback: any[] = [];

  function timelineEvents() {
    return [
      ...savedLogs.map((log) => ({
        id: `GrowLog:${log.id}`,
        userId: "diagnosis-user",
        growId: log.growId,
        plantId: log.plantId || null,
        type: "diagnosis_created",
        sourceModel: "GrowLog",
        sourceId: log.id,
        title: log.title,
        summary: log.notes,
        timestamp: log.createdAt,
        tags: log.tags || [],
        severity: "medium",
        payload: { diagnosisId: log.diagnosisId, acceptedTags: log.tags || [] }
      })),
      ...savedTasks.map((task) => ({
        id: `Task:${task.id}`,
        userId: "diagnosis-user",
        growId: task.growId,
        plantId: task.plantId || null,
        type: "task_created",
        sourceModel: "Task",
        sourceId: task.id,
        title: task.title,
        summary: task.description,
        timestamp: task.createdAt,
        tags: ["task", task.sourceType].filter(Boolean),
        severity: task.priority || "medium",
        payload: {
          sourceType: task.sourceType,
          sourceDiagnosisId: task.sourceDiagnosisId
        }
      })),
      ...savedFeedback.map((feedback) => ({
        id: `DiagnosisFeedback:${feedback.id}`,
        userId: "diagnosis-user",
        growId: feedback.growId,
        plantId: feedback.plantId || null,
        type: "diagnosis_feedback",
        sourceModel: "DiagnosisFeedback",
        sourceId: feedback.id,
        title: `Diagnosis feedback: ${feedback.verdict.replace("_", " ")}`,
        summary: feedback.notes,
        timestamp: feedback.createdAt,
        tags: ["diagnosis_feedback", feedback.verdict],
        severity: "info",
        payload: feedback
      }))
    ];
  }

  await page.addInitScript(() => {
    window.localStorage.setItem("auth_token_v1", "diagnosis-etgu-token");
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
          id: "diagnosis-user",
          email: "diagnosis@example.com",
          plan: "pro"
        },
        ctx: {
          mode: "personal",
          plan: "pro",
          subscriptionStatus: "active",
          capabilities: {
            GROWS_PERSONAL_VIEW: true,
            GROWS_PERSONAL_WRITE: true,
            LOGS_PERSONAL_WRITE: true,
            DIAGNOSE_AI: true
          },
          limits: {}
        }
      });
    }

    if (method === "GET" && url.pathname === "/api/personal/plants") {
      return fulfillJson(route, {
        plants: [
          {
            id: "plant-etgu-1",
            name: "Arbequina Olive #1",
            cropCommonName: "Olive",
            scientificName: "Olea europaea",
            cropProfileId: "crop-olive-1",
            cultivar: "Arbequina",
            stage: "fruiting",
            medium: "container mix",
            growthProfile: {
              cropProfile: "crop-olive-1",
              confirmationStatus: "user_confirmed",
              sizeMetrics: { canopyWidthCm: 140 },
              timingAdjustments: { stageDaysOffset: 8 },
              waterUseProfile: { observedDemand: "low" },
              phenoLabel: "compact"
            }
          }
        ]
      });
    }

    if (method === "GET" && url.pathname === "/api/diagnose/provider-status") {
      return fulfillJson(route, {
        success: true,
        provider: {
          providerName: "openai",
          providerModel: "gpt-4o-mini",
          configured: false,
          imageSupport: true,
          credentialsSource: "missing",
          mode: "production"
        }
      });
    }

    if (method === "POST" && url.pathname === "/api/diagnose/analyze") {
      diagnosisPayloads.push(request.postDataJSON());
      return fulfillJson(route, {
        id: "diagnosis-etgu-1",
        issueSummary: "Possible root-zone stress; container olive leaf spotting",
        sourceType: "heuristic",
        confidence: "medium",
        severity: 4,
        details: {
          diagnosisClass: "nutrition_or_root_zone_triage",
          overallHealth: "concern",
          patternSummary: "location: upper new growth",
          rootZoneSummary: "moisture: too wet; concern: slow dryback",
          environmentSummary: "temp: 78; rh: 72; vpd: 0.7",
          numberSummary: "feedEC: 1.4; runoffEC: 2.8; feedPH: 6.0; runoffPH: 6.4",
          cropIdentity: {
            commonName: "Olive",
            scientificName: "Olea europaea",
            cultivarOrStrain: "Arbequina",
            confidence: "user_confirmed",
            ambiguous: false,
            cropProfileMatched: true,
            cropProfileId: "crop-olive-1",
            cropProfileCurationStatus: "reviewed",
            requiresUserConfirmation: false
          },
          cropProfileSnapshot: {
            id: "crop-olive-1",
            displayName: "Olive",
            scientificName: "Olea europaea",
            cropCategory: "orchard_container",
            curationStatus: "reviewed"
          },
          likelyIssues: [
            {
              issue: "Possible root-zone stress",
              category: "root_zone",
              nutrient: null,
              confidence: 0.66,
              evidence: ["Leaf spotting was reported on upper canopy leaves."],
              counterEvidence: [
                "Olive leaf spots can also require pest or disease checks."
              ],
              nextChecks: ["Check drainage and inspect leaf undersides."]
            }
          ],
          recommendations: [
            "Confirm drainage and avoid applying cannabis feed defaults to olive."
          ],
          suggestedTags: ["olive", "root zone", "leaf spotting"],
          tasksToCreate: [
            { title: "Check drainage and inspect leaf undersides.", priority: "high" }
          ],
          urgency: "high",
          disclaimer:
            "GrowPathAI provides plant-health triage, not a guaranteed lab diagnosis."
        }
      });
    }

    if (method === "POST" && url.pathname === "/api/personal/logs") {
      const payload = request.postDataJSON();
      const log = {
        id: `diagnosis-log-${savedLogs.length + 1}`,
        _id: `diagnosis-log-${savedLogs.length + 1}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...payload
      };
      savedLogs.push(log);
      return fulfillJson(route, { log, created: log }, 201);
    }

    if (method === "POST" && url.pathname === "/api/personal/tasks") {
      const payload = request.postDataJSON();
      const task = {
        id: `diagnosis-task-${savedTasks.length + 1}`,
        _id: `diagnosis-task-${savedTasks.length + 1}`,
        completed: false,
        priority: payload.priority || "medium",
        createdAt: new Date().toISOString(),
        ...payload
      };
      savedTasks.push(task);
      return fulfillJson(route, { task, created: task }, 201);
    }

    if (method === "POST" && url.pathname === "/api/diagnose/diagnosis-etgu-1/feedback") {
      const payload = request.postDataJSON();
      const feedback = {
        id: `diagnosis-feedback-${savedFeedback.length + 1}`,
        diagnosisId: "diagnosis-etgu-1",
        growId: GROW_ID,
        plantId: "plant-etgu-1",
        createdAt: new Date().toISOString(),
        ...payload
      };
      savedFeedback.push(feedback);
      return fulfillJson(route, { feedback, ok: true }, 201);
    }

    if (method === "GET" && url.pathname === `/api/personal/grows/${GROW_ID}/timeline`) {
      return fulfillJson(route, { timeline: timelineEvents() });
    }

    return fulfillJson(route, { ok: true });
  });

  return { diagnosisPayloads, savedLogs, savedTasks, savedFeedback };
}

async function replaceInput(locator: any, value: string) {
  await locator.click();
  await locator.press("Control+A");
  await locator.press("Backspace");
  await locator.type(value);
}

test.describe("ETGU diagnosis intake", () => {
  for (const size of [
    { name: "desktop", width: 1280, height: 1100 },
    { name: "mobile", width: 390, height: 1000 }
  ]) {
    test(`captures ETGU fields and renders result on ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      const api = await installMocks(page);

      await page.goto(`/home/personal/diagnose?growId=${GROW_ID}`, {
        waitUntil: "domcontentloaded"
      });
      await expect(page.getByText("Plant Issue Diagnosis")).toBeVisible();
      await expect(
        page.getByText("Production AI provider needs verification")
      ).toBeVisible();

      await expect(page.getByText("Crop identity")).toBeVisible();
      await page
        .getByRole("button", { name: "Diagnose plant Arbequina Olive #1" })
        .click();
      await replaceInput(page.getByLabel("Diagnosis crop common name"), "Olive");
      await replaceInput(page.getByLabel("Diagnosis scientific name"), "Olea europaea");
      await replaceInput(page.getByLabel("Diagnosis cultivar or strain"), "Arbequina");
      await expect(
        page.getByText("Confirmed crop context", { exact: true })
      ).toBeVisible();
      await expect(
        page.getByText(/Olive \/ Olea europaea \/ Arbequina is linked/i)
      ).toBeVisible();
      await expect(page.getByText(/Canopy width: 140 cm/)).toBeVisible();
      await page
        .getByLabel("Diagnosis notes")
        .fill("Leaf spotting and possible container root-zone stress.");
      await page.getByLabel("Diagnosis root-zone notes").fill("slow dryback");
      await page.getByLabel("Diagnosis temperature").fill("78");
      await page.getByLabel("Diagnosis RH").fill("72");
      await page.getByLabel("Diagnosis VPD").fill("0.7");
      await page.getByLabel("Diagnosis feed EC").fill("1.4");
      await page.getByLabel("Diagnosis runoff EC").fill("2.8");
      await page.getByLabel("Diagnosis feed pH").fill("6.0");
      await page.getByLabel("Diagnosis runoff pH").fill("6.4");
      await expect(
        page.getByText(/Photos are used for this diagnosis request/i)
      ).toBeVisible();
      await page.getByRole("button", { name: "Run diagnosis" }).click();

      await expect(page.getByText("Inputs")).toBeVisible();
      expect(api.diagnosisPayloads[0]).toMatchObject({
        cropCommonName: "Olive",
        scientificName: "Olea europaea",
        cultivarOrStrain: "Arbequina",
        cropProfileId: "crop-olive-1",
        selectedPlantContext: {
          id: "plant-etgu-1",
          cropCommonName: "Olive",
          scientificName: "Olea europaea",
          cropProfileId: "crop-olive-1",
          growthProfile: {
            sizeMetrics: { canopyWidthCm: 140 },
            waterUseProfile: { observedDemand: "low" },
            phenoLabel: "compact"
          }
        },
        plantGrowthProfile: {
          timingAdjustments: { stageDaysOffset: 8 }
        }
      });
      await expect(page.getByText("Outputs")).toBeVisible();
      await expect(page.getByText(/commonName: Olive/)).toBeVisible();
      await expect(page.getByText("Matched crop profile: Olive")).toBeVisible();
      await expect(page.getByText("Formula / Why It Matters")).toBeVisible();
      await expect(page.getByText(/Counter-evidence/)).toBeVisible();
      await expect(page.getByRole("button", { name: "Save to Grow Log" })).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Create Follow-up Task" })
      ).toBeVisible();
      await page.getByRole("button", { name: "Diagnosis tag root zone" }).click();
      await page.getByRole("button", { name: "Save to Grow Log" }).click();
      await expect(page.getByText("Diagnosis saved to grow journal.")).toBeVisible();
      expect(api.savedLogs[0]).toMatchObject({
        growId: GROW_ID,
        plantId: "plant-etgu-1",
        diagnosisId: "diagnosis-etgu-1",
        type: "diagnosis",
        title: "Possible root-zone stress; container olive leaf spotting",
        tags: ["olive", "leaf spotting"]
      });

      await page.getByRole("button", { name: "Create Follow-up Task" }).click();
      await expect(page.getByText("Follow-up task created.")).toBeVisible();
      expect(api.savedTasks[0]).toMatchObject({
        growId: GROW_ID,
        title: "Follow up: Possible root-zone stress; container olive leaf spotting",
        sourceType: "ai_diagnosis",
        sourceObjectId: "diagnosis-etgu-1",
        sourceDiagnosisId: "diagnosis-etgu-1"
      });

      await page
        .getByLabel("Diagnosis outcome feedback notes")
        .fill("Drainage check matched the diagnosis.");
      await page.getByRole("button", { name: "Mark diagnosis helpful" }).click();
      await expect(page.getByText("Diagnosis feedback saved.")).toBeVisible();
      expect(api.savedFeedback[0]).toMatchObject({
        verdict: "helpful",
        notes: "Drainage check matched the diagnosis.",
        consentForModelTraining: false
      });

      await page.goto(`/home/personal/grows/${GROW_ID}/timeline`, {
        waitUntil: "domcontentloaded"
      });
      await expect(
        page.getByText("Possible root-zone stress; container olive leaf spotting", {
          exact: true
        })
      ).toBeVisible();
      await expect(
        page.getByText(
          "Follow up: Possible root-zone stress; container olive leaf spotting",
          {
            exact: true
          }
        )
      ).toBeVisible();
      await expect(page.getByText("Diagnosis feedback: helpful")).toBeVisible();

      await page.screenshot({
        path: `tmp/screenshots/diagnosis-etgu-${size.name}.png`,
        fullPage: true
      });
    });
  }
});
