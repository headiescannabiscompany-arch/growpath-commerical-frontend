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

    return fulfillJson(route, { ok: true });
  });

  return { diagnosisPayloads };
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
      await page.getByLabel("Diagnosis crop common name").fill("Olive");
      await page.getByLabel("Diagnosis scientific name").fill("Olea europaea");
      await page.getByLabel("Diagnosis cultivar or strain").fill("Arbequina");
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

      await page.screenshot({
        path: `tmp/screenshots/diagnosis-etgu-${size.name}.png`,
        fullPage: true
      });
    });
  }
});
