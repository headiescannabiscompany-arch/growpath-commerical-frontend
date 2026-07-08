#!/usr/bin/env node
const { spawnSync } = require("node:child_process");

const isWindows = process.platform === "win32";
const npmCmd = isWindows ? "npm.cmd" : "npm";
const shellCmd = process.env.ComSpec || "cmd.exe";

function runCheck(check) {
  if (!isWindows) {
    return spawnSync(check.command, check.args, {
      stdio: "inherit",
      shell: false
    });
  }

  const line = [check.command, ...check.args].join(" ");
  return spawnSync(shellCmd, ["/d", "/c", line], {
    stdio: "inherit",
    shell: false
  });
}
const checks = [
  { label: "lint", command: npmCmd, args: ["run", "lint"] },
  {
    label: "focused connected workflow tests",
    command: npmCmd,
    args: [
      "test",
      "--",
      "--runInBand",
      "tests/unit/CommercialWorkflowPages.test.tsx",
      "tests/unit/CommercialAlertDetailRoute.test.tsx",
      "tests/unit/CommercialTaskDetailRoute.test.tsx",
      "tests/unit/StorefrontRoute.test.tsx",
      "tests/unit/PublicCommercialRoutes.test.tsx",
      "tests/unit/CommercialFeedRoute.test.tsx",
      "tests/unit/feedPolicy.test.ts",
      "tests/unit/PersonalFeedPlacement.test.tsx",
      "tests/unit/ForumFeedSeparationRoutes.test.tsx",
      "tests/unit/CommercialLivesRoute.test.tsx",
      "tests/unit/CommercialTasksRoute.test.tsx",
      "tests/unit/HomeScheduleRoute.test.tsx",
      "tests/unit/AlertCenterRoute.test.tsx",
      "tests/unit/NotificationCenterRoute.test.tsx",
      "tests/unit/pricingConstants.test.js",
      "tests/unit/toolRuns-api.test.ts",
      "tests/unit/AppPageBackBehavior.test.tsx",
      "tests/navigation/commercialPageRegistry.test.js",
      "tests/navigation/commercialTabs.test.js",
      "tests/navigation/commercialDashboardRoutes.test.js",
      "tests/navigation/feedForumSeparationNavigation.test.js",
      "tests/unit/FirstSetupRooms.test.tsx",
      "tests/unit/FacilityRoomsRoute.test.tsx",
      "tests/unit/FacilityInventoryRoute.test.tsx",
      "tests/unit/FacilityTasksRoute.test.tsx",
      "tests/unit/FacilityTaskDetailRoute.test.tsx",
      "tests/unit/integrations_growlink.test.tsx",
      "tests/unit/ForgotPasswordScreen.test.tsx",
      "tests/unit/ResetPasswordScreen.test.tsx",
      "tests/unit/LoginEmailVerification.test.tsx",
      "src/api/__tests__/auth.emailVerification.test.ts",
      "tests/unit/IngredientLibraryRoute.test.tsx",
      "tests/unit/SoilBuilderToolScreen.test.tsx",
      "tests/unit/DryAmendmentMixToolScreen.test.tsx",
      "tests/unit/TopdressToolScreen.test.tsx",
      "tests/unit/NpkToolScreen.test.tsx",
      "tests/unit/PhenoMatrixToolScreen.test.tsx",
      "tests/unit/IpmScoutToolScreen.test.tsx",
      "tests/unit/HarvestReadinessToolScreen.test.tsx",
      "tests/unit/DryCureGuardToolScreen.test.tsx",
      "tests/unit/TissueCultureToolScreen.test.tsx",
      "tests/unit/CloneRootingToolScreen.test.tsx",
      "tests/unit/AutoGrowCalendarToolScreen.test.tsx",
      "tests/unit/PhenoHuntToolScreen.test.tsx",
      "tests/unit/GeneticsInventoryToolScreen.test.tsx",
      "tests/unit/NutrientSourceComparisonToolScreen.test.tsx",
      "tests/unit/CropSteeringProjectToolScreen.test.tsx",
      "tests/unit/StressTestToolScreen.test.tsx",
      "tests/unit/SoilNutrientBatchToolScreen.test.tsx",
      "tests/unit/RunComparisonToolScreen.test.tsx",
      "tests/unit/PhEcToolScreen.test.tsx",
      "tests/unit/SpeciesCropIdToolScreen.test.tsx",
      "src/features/personal/__tests__/homeModel.test.ts",
      "src/features/personal/tools/__tests__/saveToolRunAndOpenJournal.test.ts",
      "tests/unit/PersonalTaskCenterRoute.test.tsx",
      "tests/unit/GrowTasksScreen.test.tsx"
    ]
  },
  { label: "production web export", command: npmCmd, args: ["run", "build"] }
];

for (const check of checks) {
  console.log(`\n[verify-connected-workflows] ${check.label}`);
  const result = runCheck(check);
  if (result.error) {
    console.error(result.error);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\n[verify-connected-workflows] all checks passed");
