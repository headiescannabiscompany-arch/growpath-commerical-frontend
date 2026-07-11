#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function fail(message) {
  console.error(`[visual-polish-contract] ${message}`);
  process.exitCode = 1;
}

function requireText(label, contents, pattern, description) {
  if (!pattern.test(contents)) fail(`${label} missing ${description}`);
}

const theme = read("src/theme/theme.js");
const screenBoundary = read("src/components/ScreenBoundary.tsx");
const appPage = read("src/components/layout/AppPage.tsx");
const toolResultSurface = read("src/features/personal/tools/ToolResultSurface.tsx");
const backendToolScreen = read(
  "src/features/personal/tools/BackendCalculatorToolScreen.tsx"
);
const personalHome = read("src/app/home/personal/(tabs)/index.tsx");
const personalTools = read("src/app/home/personal/(tabs)/tools/index.tsx");
const commercialHome = read("src/app/home/commercial/index.tsx");
const commercialProducts = read("src/app/home/commercial/products/index.tsx");
const commercialInventory = read("src/app/home/commercial/inventory.tsx");
const facilityDashboard = read("src/app/home/facility/(tabs)/dashboard.tsx");
const facilityInventory = read("src/app/home/facility/(tabs)/inventory.tsx");
const facilityReports = read("src/app/home/facility/(tabs)/reports.tsx");
const forumRoute = read("src/app/home/personal/(tabs)/forum/index.tsx");
const commercialFeed = read("src/app/home/commercial/feed.tsx");
const connectedTodo = read("docs/growpath-connected-workflows-master-todo-2026-07-06.md");

const tests = {
  themeTokens: read("tests/unit/themeTokens.test.js"),
  personalBack: read("tests/unit/PersonalToolSharedBackRoutes.test.tsx"),
  facilityInventory: read("tests/unit/FacilityInventoryRoute.test.tsx"),
  commercialCreate: read("tests/unit/CommercialInventoryCreateRoute.test.tsx"),
  commercialWorkflow: read("tests/unit/CommercialWorkflowPages.test.tsx"),
  growVisual: read("e2e/grow-workspace-visual.spec.ts")
};

[
  ["card radius token", /card:\s*8/],
  ["pill radius token", /pill:\s*999/]
].forEach(([description, pattern]) => {
  requireText("theme tokens", theme, pattern, description);
});

[
  ["card radius assertion", /radius\.card\)\.toBe\(8\)/],
  ["pill radius assertion", /radius\.pill\)\.toBe\(999\)/]
].forEach(([description, pattern]) => {
  requireText("theme token tests", tests.themeTokens, pattern, description);
});

[
  ["shared back fallback", /backFallbackHref/],
  ["shared back button", /BackButton/],
  ["visible crash fallback", /Screen crashed/],
  ["accessible title shell", /title/]
].forEach(([description, pattern]) => {
  requireText("ScreenBoundary", screenBoundary, pattern, description);
});

[
  ["commercial/facility app shell", /export default function AppPage/],
  ["feed banner placement", /FeedBanner/],
  ["feed rail placement", /FeedRail/],
  ["back fallback support", /backFallbackHref/],
  ["long content support", /longContent/]
].forEach(([description, pattern]) => {
  requireText("AppPage", appPage, pattern, description);
});

[
  ["shared result metrics", /metrics/],
  ["shared result notices", /notices/],
  ["shared result actions", /actions/],
  ["live feedback", /accessibilityLiveRegion/],
  ["8px result card radius", /borderRadius:\s*8/]
].forEach(([description, pattern]) => {
  requireText("ToolResultSurface", toolResultSurface, pattern, description);
});

[
  ["tool shell uses ScreenBoundary", /ScreenBoundary/],
  ["tool shell uses result surface", /ToolResultSurface/],
  ["tool shell uses 8px cards", /borderRadius:\s*8/],
  ["tool shell uses shared back fallback", /backFallbackHref="\/home\/personal\/tools"/]
].forEach(([description, pattern]) => {
  requireText("BackendCalculatorToolScreen", backendToolScreen, pattern, description);
});

[
  ["personal home shared radius", personalHome, /radius\.card/],
  ["personal tools shared radius", personalTools, /radius\.card/],
  ["personal tools grouped categories", personalTools, /category|area/i],
  ["commercial home AppPage", commercialHome, /<AppPage/],
  ["commercial home radius", commercialHome, /radius\.card/],
  ["commercial products AppPage", commercialProducts, /<AppPage/],
  ["commercial products radius", commercialProducts, /radius\.card/],
  ["commercial inventory ScreenBoundary", commercialInventory, /ScreenBoundary/],
  ["commercial inventory radius", commercialInventory, /radius\.card/],
  ["facility dashboard radius", facilityDashboard, /radius\.card/],
  ["facility inventory ScreenBoundary", facilityInventory, /ScreenBoundary/],
  ["facility inventory radius", facilityInventory, /radius\.card/],
  ["facility reports radius", facilityReports, /radius\.card/]
].forEach(([description, contents, pattern]) => {
  requireText("representative polished surfaces", contents, pattern, description);
});

[
  ["Forum/Q&A discussion copy", forumRoute, /Forum \/ Q&A|discussion|Q&A/i],
  ["Feed/Campaigns outreach copy", commercialFeed, /Feed|Campaign|campaign|outreach/i],
  ["connected workflow visual standard", connectedTodo, /Facility currently has the strongest visual appeal[\s\S]*Personal should feel like a polished grow OS[\s\S]*Commercial should feel like a polished brand\/storefront workspace/]
].forEach(([description, contents, pattern]) => {
  requireText("visual product language", contents, pattern, description);
});

[
  ["personal tool back-route tests", tests.personalBack, /uses shared back behavior[\s\S]*PDF \/ Export[\s\S]*Nutrient Chemistry/],
  ["facility inventory visual behavior tests", tests.facilityInventory, /No inventory items yet[\s\S]*Open inventory AI review/],
  ["commercial inventory shell tests", tests.commercialCreate, /Shared Back \/home\/commercial\/inventory[\s\S]*Create Inventory Support Record/],
  ["commercial workflow polished inventory tests", tests.commercialWorkflow, /Inventory Support Record[\s\S]*Inventory Support Item/],
  ["grow workspace visual Playwright audit", tests.growVisual, /grow workspace visual audit[\s\S]*desktop[\s\S]*mobile[\s\S]*page\.screenshot/]
].forEach(([description, contents, pattern]) => {
  requireText("visual polish tests", contents, pattern, description);
});

if (!process.exitCode) {
  console.log("[visual-polish-contract] Visual polish contract verified");
}
