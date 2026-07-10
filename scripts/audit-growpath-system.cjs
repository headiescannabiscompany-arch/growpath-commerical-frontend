"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const APP = path.join(SRC, "app");
const API = path.join(SRC, "api");
const BACKEND = path.join(ROOT, "backend");
const OUT_DIR = path.join(ROOT, "tmp", "scan");

const IGNORE_DIRS = new Set([
  ".git",
  ".expo",
  ".npm-cache",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
  "tmp"
]);

const CODE_EXTS = new Set([".js", ".jsx", ".ts", ".tsx", ".cjs", ".mjs"]);

const MODULES = [
  {
    phase: "Foundation",
    name: "ToolRun canonical contract",
    routeOptional: true,
    keywords: ["toolrun", "toolRuns", "ToolRun"],
    required: ["model-or-api", "save-reload", "ownership-tests"]
  },
  {
    phase: "Foundation",
    name: "SourceRecord / provenance",
    routeOptional: true,
    keywords: ["sourceRecord", "provenance", "sourceRecords", "sourceConfidence"],
    required: ["model", "source-confidence", "tests"]
  },
  {
    phase: "Foundation",
    name: "Product / Ingredient Library",
    route: "/home/personal/tools/ingredient-library",
    keywords: [
      "Product / Ingredient Library",
      "listProductIngredients",
      "ProductIngredient",
      "guaranteed analysis"
    ],
    required: ["model", "api", "ui", "tests"]
  },
  {
    phase: "Foundation",
    name: "Recipe model",
    routeOptional: true,
    keywords: ["recipe", "nutrientRecipes", "Recipe"],
    required: ["model", "api", "ui", "tests"]
  },
  {
    phase: "Foundation",
    name: "Timeline event schema",
    routeOptional: true,
    keywords: ["timeline", "TimelineEvent", "events"],
    required: ["model", "api", "grow-links", "tests"]
  },
  {
    phase: "Foundation",
    name: "Task source-object links",
    routeOptional: true,
    keywords: ["sourceObject", "sourceType", "linkedTask", "tasks"],
    required: ["model", "api", "ownership-tests"]
  },
  {
    phase: "Foundation",
    name: "Photo / media metadata",
    routeOptional: true,
    keywords: ["photos", "media", "uploads", "image"],
    required: ["metadata", "ownership", "retention"]
  },
  {
    phase: "Foundation",
    name: "Crop profile / taxon base model",
    routeOptional: true,
    keywords: ["cropProfile", "taxon", "species", "cropKnowledge"],
    required: ["model", "api", "diagnosis-links"]
  },
  {
    phase: "Soil & Nutrients",
    name: "NPK / Nutrient Recipe Calculator",
    route: "/home/personal/tools/npk",
    keywords: ["npk", "nutrient recipe", "nutrientRecipes"],
    required: ["calculator", "ToolRun", "log", "task", "recipe"]
  },
  {
    phase: "Soil & Nutrients",
    name: "Nutrient Release Chemistry",
    route: "/home/personal/tools/nutrient-chemistry",
    keywords: ["nutrient-chemistry", "releaseClass", "releaseWindow", "nutrientForms"],
    required: ["library", "provenance", "tests"]
  },
  {
    phase: "Soil & Nutrients",
    name: "Compatibility Checker",
    route: "/home/personal/tools/nutrient-chemistry",
    keywords: [
      "compatibility",
      "Compatibility check",
      "analyzeCompatibility",
      "precipitation",
      "mixingOrder",
      "antagonism"
    ],
    required: ["rules", "NPK integration", "tests"]
  },
  {
    phase: "Soil & Nutrients",
    name: "Nutrient Source Comparison",
    route: "/home/personal/tools/nutrient-source-comparison",
    keywords: ["source comparison", "fastSources", "mediumSources", "slowSources"],
    required: ["library", "intent", "tests"]
  },
  {
    phase: "Soil & Nutrients",
    name: "Soil Builder",
    route: "/home/personal/tools/soil-builder",
    keywords: [
      "soil builder",
      "soil_mix",
      "basePercent",
      "compostPercent",
      "aerationPercent"
    ],
    required: ["route", "recipe", "task", "timeline"]
  },
  {
    phase: "Soil & Nutrients",
    name: "Dry Amendment Mix Builder",
    route: "/home/personal/tools/dry-amendment-mix",
    keywords: ["dry amendment", "dry_amendment", "achievedRatio"],
    required: ["route", "recipe", "ToolRun", "task"]
  },
  {
    phase: "Soil & Nutrients",
    name: "Topdress Planner",
    route: "/home/personal/tools/topdress",
    keywords: ["topdress", "topdress-plan", "plannedApplyDate"],
    required: ["route", "ToolRun", "log", "task"]
  },
  {
    phase: "Soil & Nutrients",
    name: "pH / EC Range Check",
    route: "/home/personal/tools/ph-ec",
    keywords: ["ph-ec", "runoffEC", "runoffPH", "ecStatus"],
    required: ["route", "ToolRun", "retest-task", "tests"]
  },
  {
    phase: "Diagnosis / IPM / Crop ID",
    name: "ETGU Diagnosis Rules",
    route: "/home/personal/diagnose",
    keywords: [
      "ETGU",
      "symptom pattern",
      "root-zone context",
      "measured numbers",
      "counterEvidence",
      "GrowPath AI reasoning"
    ],
    required: ["rules", "intake", "tests"]
  },
  {
    phase: "Diagnosis / IPM / Crop ID",
    name: "AI Diagnosis",
    route: "/home/personal/diagnose",
    keywords: ["diagnose", "diagnosis", "vision"],
    required: ["photo", "structured-output", "log", "task"]
  },
  {
    phase: "Diagnosis / IPM / Crop ID",
    name: "IPM Scout",
    route: "/home/personal/tools/ipm-scout",
    keywords: ["ipm", "scout", "stickyTrap", "pestSeen"],
    required: ["route", "organism-link", "task"]
  },
  {
    phase: "Diagnosis / IPM / Crop ID",
    name: "Organism Library",
    routeOptional: true,
    keywords: ["OrganismProfile", "organism", "beneficialOrPest"],
    required: ["model", "sources", "ui"]
  },
  {
    phase: "Genetics / Pheno / Stress",
    name: "Genetics Inventory",
    route: "/home/personal/tools/genetics-inventory",
    keywords: ["genetics", "cultivar", "breeder", "parentage"],
    required: ["model", "ui", "grow-links"]
  },
  {
    phase: "Genetics / Pheno / Stress",
    name: "Pheno Hunting",
    route: "/home/personal/tools/pheno-hunt",
    keywords: ["pheno", "keeper", "weightedScores", "stageScores"],
    required: ["project", "plant-records", "reports"]
  },
  {
    phase: "Genetics / Pheno / Stress",
    name: "Stress Testing",
    route: "/home/personal/tools/stress-test",
    keywords: ["stress testing", "stressResponseScore", "recoveryScore"],
    required: ["project", "scorecards", "pheno-links"]
  },
  {
    phase: "Genetics / Pheno / Stress",
    name: "Crop Steering Projects",
    route: "/home/personal/tools/crop-steering-project",
    keywords: ["crop-steering", "dryback", "steeringIntent"],
    required: ["project", "measurements", "tasks"]
  },
  {
    phase: "Propagation / Tissue Culture",
    name: "Clone Rooting Troubleshooter",
    route: "/home/personal/tools/clone-rooting",
    keywords: ["clone rooting", "daysSinceCut", "rootingHormone"],
    required: ["route", "ToolRun", "task"]
  },
  {
    phase: "Propagation / Tissue Culture",
    name: "Tissue Culture",
    route: "/home/personal/tools/tissue-culture",
    keywords: ["tissue culture", "vessels", "mediaRecipe", "contamination"],
    required: ["projects", "batch", "vessels", "tasks"]
  },
  {
    phase: "Harvest / History",
    name: "Harvest Readiness AI",
    route: "/home/personal/tools/harvest-readiness",
    keywords: ["harvest", "trichome", "amberPercent", "readiness"],
    required: ["photos", "harvest-task", "history"]
  },
  {
    phase: "Harvest / History",
    name: "Dry / Cure Guard",
    route: "/home/personal/tools/dry-cure-guard",
    keywords: ["dry cure", "dry-cure", "jarRH", "dewPointSpread"],
    required: ["route", "ToolRun", "harvest-batch", "task"]
  },
  {
    phase: "Harvest / History",
    name: "Run-To-Run Comparison",
    route: "/home/personal/tools/run-comparison",
    keywords: ["run comparison", "run-to-run", "bestRun", "recommendationsForNextRun"],
    required: ["history-query", "report", "tests"]
  },
  {
    phase: "Harvest / History",
    name: "Auto Grow Calendar",
    route: "/home/personal/tools/auto-grow-calendar",
    keywords: ["auto grow calendar", "expectedHarvestWindows", "stageTimeline"],
    required: ["calendar-events", "tasks", "grow-links"]
  },
  {
    phase: "Business / Production",
    name: "Soil & Nutrient Batch Planner",
    route: "/home/personal/tools/soil-nutrient-batch",
    keywords: [
      "soil-nutrient-batch",
      "Soil & Nutrient Batch Planner",
      "ingredientPullSheet",
      "costPerBag",
      "production task plan"
    ],
    required: ["recipe-links", "inventory", "tasks", "costing"]
  },
  {
    phase: "Facility",
    name: "Facility Insights Summary",
    route: "/home/facility/dashboard",
    keywords: [
      "facility insights",
      "activeGrowsCount",
      "overdueTasksCount",
      "latestToolRuns"
    ],
    required: ["existing-data-only", "read-only", "tests"]
  }
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORE_DIRS.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else if (entry.isFile() && CODE_EXTS.has(path.extname(entry.name))) out.push(abs);
  }
  return out;
}

function read(abs) {
  return fs.readFileSync(abs, "utf8").replace(/^\uFEFF/, "");
}

function rel(abs) {
  return path.relative(ROOT, abs).replace(/\\/g, "/");
}

function toRoute(abs) {
  const appRel = path.relative(APP, abs).replace(/\\/g, "/");
  const noExt = appRel.replace(/\.(tsx?|jsx?)$/i, "");
  const segments = noExt
    .split("/")
    .filter(Boolean)
    .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")))
    .filter((segment) => segment !== "_layout");
  if (!segments.length) return null;
  if (segments[segments.length - 1] === "index") segments.pop();
  return `/${segments.join("/")}`;
}

function collectFiles() {
  const appFiles = walk(APP).filter((f) => /\.(tsx?|jsx?)$/i.test(f));
  const apiFiles = walk(API);
  const backendRouteFiles = walk(path.join(BACKEND, "routes")).filter(
    (f) => !/\.test\.[cm]?[jt]s$/i.test(f)
  );
  const backendModelFiles = walk(path.join(BACKEND, "models"));
  const testFiles = walk(ROOT).filter((f) => /\.(test|spec)\.[cm]?[jt]sx?$/i.test(f));
  const docs = walk(path.join(ROOT, "docs")).filter((f) => /\.md$/i.test(f));

  const searchable = [
    ...appFiles,
    ...apiFiles,
    ...backendRouteFiles,
    ...backendModelFiles,
    ...testFiles,
    ...docs
  ]
    .filter((f) => fs.existsSync(f))
    .map((file) => ({ file, rel: rel(file), text: read(file) }));

  const routes = appFiles
    .map((file) => ({ file: rel(file), route: toRoute(file) }))
    .filter((row) => row.route);

  return {
    appFiles,
    apiFiles,
    backendRouteFiles,
    backendModelFiles,
    testFiles,
    docs,
    searchable,
    routes
  };
}

function routeSource(routes, route) {
  const row = routes.find((candidate) => candidate.route === route);
  if (!row) return "";
  return read(path.join(ROOT, row.file));
}

function routeIsRedirectOnly(routes, route, target) {
  const source = routeSource(routes, route);
  if (!source) return false;
  return (
    /\bRedirect\b/.test(source) &&
    source.includes(`href="${target}"`) &&
    !/\bcreatePersonalTask\b|\bcreatePersonalLog\b|\blistPersonalTasks\b|\blistPersonalLogs\b/.test(
      source
    )
  );
}

function routeUsesTaskCenter(routes, route) {
  const source = routeSource(routes, route);
  if (!source) return false;
  return (
    /Task Center \/ Schedule|PersonalTaskCenterRoute/.test(source) &&
    /\blistPersonalTasks\b/.test(source) &&
    /\bSchedulePicker\b/.test(source)
  );
}

function routeIsWorkspacePostRedirect(routes, route) {
  const source = routeSource(routes, route);
  if (!source) return false;
  return (
    /\bRedirect\b/.test(source) &&
    source.includes('href="/home/personal/forum/new-post"') &&
    source.includes('href="/home/commercial/feed"') &&
    source.includes('href="/feed"') &&
    !/\bCreatePostScreen\b|\bcreateFeedPost\b|\buseCreatePost\b/.test(source)
  );
}

function commercialCommunityUsesForum(routes) {
  const source = routeSource(routes, "/home/commercial/community");
  if (!source) return false;
  return (
    source.includes('from "@/api/forum"') &&
    /\bgetLatestPosts\b/.test(source) &&
    /\bcreatePost\b/.test(source) &&
    /Brand Forum \/ Q&A/.test(source) &&
    /Feed \/[\s\n]+Campaigns stays advertising and outreach/.test(source) &&
    !source.includes('from "@/api/commercialFeed"') &&
    !/\bcreateCommercialFeedPost\b|\blistCommercialFeedPosts\b/.test(source)
  );
}

function legacyCommunitiesRouteIsForumDirectory(routes) {
  const source = routeSource(routes, "/communities");
  if (!source) return false;
  return (
    /Forum Directory/.test(source) &&
    /Search forum groups/.test(source) &&
    /\blistGuilds\b/.test(source) &&
    !/Search communities|Community Feed|Feed \/ Campaigns|commercialFeed/.test(source)
  );
}

function personalCommunityUsesForumAndCampaignPlacements(routes) {
  const source = routeSource(routes, "/home/personal/community");
  if (!source) return false;
  return (
    /Forum \/ Q&A/.test(source) &&
    /\blistForumPosts\b/.test(source) &&
    /\blistGuilds\b/.test(source) &&
    source.includes("href={`/forum/post/${encodeURIComponent(id)}`}") &&
    /\bPersonalFeedPlacement\b/.test(source) &&
    /commercial\/facility outreach, not discussion/.test(source) &&
    !/createCommercialFeedPost|listCommercialFeedCampaigns|from "@\/api\/commercialFeed"/.test(
      source
    )
  );
}

function facilityFeedCompatibilityUsesCampaignRoute() {
  const file = path.join(SRC, "screens", "FacilityFeedScreen.js");
  if (!fs.existsSync(file)) return false;
  const source = read(file);
  return (
    source.includes('from "../app/feed"') &&
    /\bCommercialFeedRoute\b/.test(source) &&
    !source.includes('from "./FeedScreen"') &&
    !/\bgetFeed\b|\bapiRoutes\.POSTS\.FEED\b|\/api\/posts\/feed/.test(source)
  );
}

function legacyFeedScreenUsesCampaignRoute() {
  const file = path.join(SRC, "screens", "FeedScreen.js");
  if (!fs.existsSync(file)) return false;
  const source = read(file);
  return (
    source.includes('from "../app/feed"') &&
    /\bCommercialFeedRoute\b/.test(source) &&
    !/\bgetFeed\b|\bapiRoutes\.POSTS\.FEED\b|\/api\/posts\/feed|Community Feed|Social Feed/.test(
      source
    )
  );
}

function commercialFeedApiUsesCampaignEndpoint() {
  const file = path.join(SRC, "api", "commercialFeed.ts");
  if (!fs.existsSync(file)) return false;
  const source = read(file);
  return (
    source.includes('apiRequest("/api/commercial/feed"') &&
    !source.includes('apiRequest("/api/commercial/posts"')
  );
}

function activeFeedUiUsesCampaignApiNames() {
  const files = [
    path.join(SRC, "app", "feed", "index.tsx"),
    path.join(SRC, "components", "feed", "FeedRail.tsx")
  ];
  return files.every((file) => {
    if (!fs.existsSync(file)) return false;
    const source = read(file);
    return (
      /\blistCommercialFeedCampaigns\b/.test(source) &&
      !/\blistCommercialFeedPosts\b|\bcreateCommercialFeedPost\b/.test(source)
    );
  });
}

function legacyPostsApiUsesForumEndpoints() {
  const file = path.join(SRC, "api", "posts.js");
  if (!fs.existsSync(file)) return false;
  const source = read(file);
  return (
    /apiRoutes\.FORUM\.FEED_LATEST/.test(source) &&
    /apiRoutes\.FORUM\.FEED_TRENDING/.test(source) &&
    /apiRoutes\.FORUM\.CREATE/.test(source) &&
    /apiRoutes\.FORUM\.LIKE/.test(source) &&
    /apiRoutes\.FORUM\.COMMENT/.test(source) &&
    !/apiRoutes\.POSTS|\/api\/posts/.test(source)
  );
}

function legacyToolsScreenUsesPersonalToolsHub() {
  const file = path.join(SRC, "screens", "ToolsScreen.js");
  if (!fs.existsSync(file)) return false;
  const source = read(file);
  return (
    source.includes('from "../app/home/personal/(tabs)/tools"') &&
    /\bToolsHubScreen\b/.test(source) &&
    !/Single-User Tools|VPDCalculator|NutrientCalculator|Locked.*Upgrade to access/.test(
      source
    )
  );
}

function legacyStorefrontScreenUsesCommercialOwnerScreen() {
  const file = path.join(SRC, "screens", "StorefrontScreen.js");
  if (!fs.existsSync(file)) return false;
  const source = read(file);
  return (
    source.includes('from "@/screens/commercial/StorefrontOwnerScreen"') &&
    /\bStorefrontOwnerScreen\b/.test(source) &&
    !/\bcreateProduct\b|\bfetchProducts\b|\bupdateProduct\b|\bdeleteProduct\b|\bcreateStorefront\b/.test(
      source
    ) &&
    !/External purchase URL|Save storefront|Add Product/.test(source)
  );
}

function facilityIntegrationsUsesRoomImport(routes) {
  const source = routeSource(routes, "/home/facility/integrations");
  if (!source) return false;
  return (
    /Sensor Integrations/.test(source) &&
    /Build rooms from controller data/.test(source) &&
    source.includes('href="/home/facility/rooms"') &&
    /Read-only sync comes first/.test(source) &&
    /Write\/control endpoints stay disabled/.test(source) &&
    /Imported data should power rooms, alerts, VPD\/dew point review, AI summaries,\s+and tasks/.test(
      source
    )
  );
}

function sharedSourceResolverCoversWorkflowLinks() {
  const resolverFile = path.join(SRC, "utils", "sourceLinks.ts");
  const personalTasksFile = path.join(APP, "home", "personal", "(tabs)", "tasks.tsx");
  const growTimelineFile = path.join(
    APP,
    "home",
    "personal",
    "(tabs)",
    "grows",
    "[growId]",
    "timeline.tsx"
  );
  const personalHomeModelFile = path.join(SRC, "features", "personal", "homeModel.ts");
  if (
    !fs.existsSync(resolverFile) ||
    !fs.existsSync(personalTasksFile) ||
    !fs.existsSync(growTimelineFile) ||
    !fs.existsSync(personalHomeModelFile)
  ) {
    return false;
  }
  const resolver = read(resolverFile);
  const personalTasks = read(personalTasksFile);
  const growTimeline = read(growTimelineFile);
  const personalHomeModel = read(personalHomeModelFile);
  return (
    /export function sourceObjectHref/.test(resolver) &&
    /sourceType === "tool_run"/.test(resolver) &&
    /sourceType === "live_replay"/.test(resolver) &&
    /sourceType === "ai_diagnosis"/.test(resolver) &&
    /sourceType === "automation_policy"/.test(resolver) &&
    /sourceType === "grow_log"/.test(resolver) &&
    /sourceType === "lesson_release"/.test(resolver) &&
    /sourceType === "product_launch"/.test(resolver) &&
    /sourceType === "scheduled_feed_post"/.test(resolver) &&
    /sourceType === "alert_snooze"/.test(resolver) &&
    /sourceType === "facility_sop"/.test(resolver) &&
    /sourceType === "grow_milestone"/.test(resolver) &&
    /sourceType === "inventory"/.test(resolver) &&
    /sourceType === "notification"/.test(resolver) &&
    /\/home\/facility\/rooms\?roomId=/.test(resolver) &&
    /\/home\/personal\/logs\/\$\{encoded\(logId\)\}/.test(resolver) &&
    personalTasks.includes('from "@/utils/sourceLinks"') &&
    growTimeline.includes('from "@/utils/sourceLinks"') &&
    personalHomeModel.includes('from "@/utils/sourceLinks"') &&
    /\bsourceObjectHref\b/.test(personalTasks) &&
    /\bsourceObjectHref\b/.test(growTimeline) &&
    /\bsourceObjectHref\b/.test(personalHomeModel)
  );
}

function keywordHits(searchable, keywords) {
  const hits = [];
  for (const keyword of keywords) {
    const needle = keyword.toLowerCase();
    for (const item of searchable) {
      if (
        item.text.toLowerCase().includes(needle) ||
        item.rel.toLowerCase().includes(needle)
      ) {
        hits.push({ keyword, file: item.rel });
      }
    }
  }
  const unique = [];
  const seen = new Set();
  for (const hit of hits) {
    const key = `${hit.keyword}\0${hit.file}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(hit);
    }
  }
  return unique;
}

function parseFeatureStatus() {
  const file = path.join(SRC, "config", "featureStatus.ts");
  if (!fs.existsSync(file)) return [];
  const source = read(file);
  const blocks = source.split(/\n\s*\{\s*\n/).slice(1);
  return blocks
    .map((block) => {
      const key = /key:\s*"([^"]+)"/.exec(block)?.[1];
      const title = /title:\s*"([^"]+)"/.exec(block)?.[1];
      const status = /status:\s*"([^"]+)"/.exec(block)?.[1];
      const href = /href:\s*"([^"]+)"/.exec(block)?.[1];
      return key ? { key, title, status, href } : null;
    })
    .filter(Boolean);
}

function statusFor(module, hits, routeExists) {
  if (routeExists && hits.length >= 6) return "present-foundation";
  if (module.routeOptional && hits.length >= 6) return "present-foundation";
  if (routeExists || hits.length >= 6) return "partial";
  if (hits.length > 0) return "trace-only";
  return "missing";
}

function main() {
  const files = collectFiles();
  const featureStatus = parseFeatureStatus();
  const routeSet = new Set(files.routes.map((row) => row.route));

  const moduleRows = MODULES.map((module) => {
    const hits = keywordHits(files.searchable, module.keywords);
    const routeExists = module.route ? routeSet.has(module.route) : false;
    const featureMatches = featureStatus.filter((feature) => {
      const haystack = [feature.key, feature.title, feature.href]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return module.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
    });
    return {
      phase: module.phase,
      name: module.name,
      status: statusFor(module, hits, routeExists),
      expectedRoute: module.route || null,
      routeExists,
      required: module.required,
      featureStatus: featureMatches,
      evidenceFiles: [...new Set(hits.map((hit) => hit.file))].sort().slice(0, 20),
      evidenceCount: hits.length
    };
  });

  const topLevelLogsRouteExists = routeSet.has("/home/personal/logs");
  const topLevelTasksRouteExists = routeSet.has("/home/personal/tasks");
  const legacyGlobalLogsRouteExists = routeSet.has("/logs");
  const legacyGlobalOrdersRouteExists = routeSet.has("/orders");
  const legacyGlobalCampaignsRouteExists = routeSet.has("/campaigns");
  const legacyGlobalStorefrontRouteExists = routeSet.has("/storefront");
  const legacyCreatePostRouteExists = routeSet.has("/create-post");
  const legacyPersonalSocialToolsRouteExists = routeSet.has(
    "/home/personal/more/social-tools"
  );
  const topLevelLogsRedirectOnly = routeIsRedirectOnly(
    files.routes,
    "/home/personal/logs",
    "/home/personal/grows"
  );
  const legacyGlobalLogsRedirectOnly = routeIsRedirectOnly(
    files.routes,
    "/logs",
    "/home/commercial"
  );
  const legacyGlobalOrdersRedirectOnly = routeIsRedirectOnly(
    files.routes,
    "/orders",
    "/home/commercial/orders"
  );
  const legacyGlobalCampaignsRedirectOnly = routeIsRedirectOnly(
    files.routes,
    "/campaigns",
    "/home/commercial/marketing"
  );
  const legacyGlobalStorefrontRedirectOnly = routeIsRedirectOnly(
    files.routes,
    "/storefront",
    "/home/commercial/storefront"
  );
  const topLevelTasksRedirectOnly = routeIsRedirectOnly(
    files.routes,
    "/home/personal/tasks",
    "/home/personal/grows"
  );
  const topLevelTasksTaskCenter = routeUsesTaskCenter(
    files.routes,
    "/home/personal/tasks"
  );
  const legacyCreatePostWorkspaceRedirect = routeIsWorkspacePostRedirect(
    files.routes,
    "/create-post"
  );
  const legacyPersonalSocialToolsRedirectOnly = routeIsRedirectOnly(
    files.routes,
    "/home/personal/more/social-tools",
    "/home/personal/forum"
  );
  const commercialCommunityForumOnly = commercialCommunityUsesForum(files.routes);
  const legacyCommunitiesForumDirectory = legacyCommunitiesRouteIsForumDirectory(
    files.routes
  );
  const personalCommunityForumOnly = personalCommunityUsesForumAndCampaignPlacements(
    files.routes
  );
  const facilityFeedCompatibilityCampaignOnly =
    facilityFeedCompatibilityUsesCampaignRoute();
  const legacyFeedScreenCampaignOnly = legacyFeedScreenUsesCampaignRoute();
  const commercialFeedApiCampaignEndpoint = commercialFeedApiUsesCampaignEndpoint();
  const activeFeedUiCampaignApiNames = activeFeedUiUsesCampaignApiNames();
  const legacyPostsApiForumOnly = legacyPostsApiUsesForumEndpoints();
  const legacyToolsScreenPersonalHub = legacyToolsScreenUsesPersonalToolsHub();
  const legacyStorefrontScreenCommercialOwner =
    legacyStorefrontScreenUsesCommercialOwnerScreen();
  const facilityIntegrationsRoomImport = facilityIntegrationsUsesRoomImport(files.routes);
  const sharedSourceResolverConnectedWorkflow = sharedSourceResolverCoversWorkflowLinks();

  const decisionChecks = {
    topLevelLogsRouteExists,
    topLevelLogsRedirectOnly,
    topLevelLogsVisibleModule: topLevelLogsRouteExists && !topLevelLogsRedirectOnly,
    legacyGlobalLogsRouteExists,
    legacyGlobalLogsRedirectOnly,
    legacyGlobalLogsVisibleModule:
      legacyGlobalLogsRouteExists && !legacyGlobalLogsRedirectOnly,
    legacyGlobalOrdersRouteExists,
    legacyGlobalOrdersRedirectOnly,
    legacyGlobalOrdersVisibleModule:
      legacyGlobalOrdersRouteExists && !legacyGlobalOrdersRedirectOnly,
    legacyGlobalCampaignsRouteExists,
    legacyGlobalCampaignsRedirectOnly,
    legacyGlobalCampaignsVisibleModule:
      legacyGlobalCampaignsRouteExists && !legacyGlobalCampaignsRedirectOnly,
    legacyGlobalStorefrontRouteExists,
    legacyGlobalStorefrontRedirectOnly,
    legacyGlobalStorefrontVisibleModule:
      legacyGlobalStorefrontRouteExists && !legacyGlobalStorefrontRedirectOnly,
    legacyCreatePostRouteExists,
    legacyCreatePostWorkspaceRedirect,
    legacyCreatePostVisibleComposer:
      legacyCreatePostRouteExists && !legacyCreatePostWorkspaceRedirect,
    legacyPersonalSocialToolsRouteExists,
    legacyPersonalSocialToolsRedirectOnly,
    legacyPersonalSocialToolsVisibleModule:
      legacyPersonalSocialToolsRouteExists && !legacyPersonalSocialToolsRedirectOnly,
    commercialCommunityForumOnly,
    legacyCommunitiesForumDirectory,
    personalCommunityForumOnly,
    facilityFeedCompatibilityCampaignOnly,
    legacyFeedScreenCampaignOnly,
    commercialFeedApiCampaignEndpoint,
    activeFeedUiCampaignApiNames,
    legacyPostsApiForumOnly,
    legacyToolsScreenPersonalHub,
    legacyStorefrontScreenCommercialOwner,
    facilityIntegrationsRoomImport,
    sharedSourceResolverConnectedWorkflow,
    topLevelTasksRouteExists,
    topLevelTasksRedirectOnly,
    topLevelTasksTaskCenter,
    topLevelTasksVisibleModule:
      topLevelTasksRouteExists && !topLevelTasksRedirectOnly && topLevelTasksTaskCenter,
    facilityInsightsRouteExists:
      [...routeSet].some((route) => /facility.*insights/i.test(route)) ||
      files.searchable.some((file) => file.rel === "backend/routes/facility.insights.js"),
    commercialAiCopyHits: keywordHits(files.searchable, [
      "commercial AI",
      "business helper"
    ])
      .filter((hit) => !hit.file.startsWith("docs/build/"))
      .map((hit) => hit.file)
  };

  const summary = moduleRows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});

  const report = {
    generatedAt: new Date().toISOString(),
    counts: {
      frontendRoutes: files.routes.length,
      apiFiles: files.apiFiles.length,
      backendRouteFiles: files.backendRouteFiles.length,
      backendModelFiles: files.backendModelFiles.length,
      testFiles: files.testFiles.length,
      featureStatusRows: featureStatus.length
    },
    summary,
    decisionChecks,
    modules: moduleRows
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, "growpath-system-audit.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8"
  );

  const lines = [
    "# GrowPathAI System Audit",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Counts",
    `- Frontend routes: ${report.counts.frontendRoutes}`,
    `- API files: ${report.counts.apiFiles}`,
    `- Backend route files: ${report.counts.backendRouteFiles}`,
    `- Backend model files: ${report.counts.backendModelFiles}`,
    `- Test/spec files: ${report.counts.testFiles}`,
    `- Feature status rows: ${report.counts.featureStatusRows}`,
    "",
    "## Decision Checks",
    `- Top-level Logs visible module: ${decisionChecks.topLevelLogsVisibleModule}`,
    `- Top-level Logs redirect-only stale-link guard: ${decisionChecks.topLevelLogsRedirectOnly}`,
    `- Legacy /logs visible module: ${decisionChecks.legacyGlobalLogsVisibleModule}`,
    `- Legacy /logs redirect-only stale-link guard: ${decisionChecks.legacyGlobalLogsRedirectOnly}`,
    `- Legacy /orders visible module: ${decisionChecks.legacyGlobalOrdersVisibleModule}`,
    `- Legacy /orders redirect-only stale-link guard: ${decisionChecks.legacyGlobalOrdersRedirectOnly}`,
    `- Legacy /campaigns visible module: ${decisionChecks.legacyGlobalCampaignsVisibleModule}`,
    `- Legacy /campaigns redirect-only stale-link guard: ${decisionChecks.legacyGlobalCampaignsRedirectOnly}`,
    `- Legacy /storefront visible module: ${decisionChecks.legacyGlobalStorefrontVisibleModule}`,
    `- Legacy /storefront redirect-only stale-link guard: ${decisionChecks.legacyGlobalStorefrontRedirectOnly}`,
    `- Legacy /create-post visible composer: ${decisionChecks.legacyCreatePostVisibleComposer}`,
    `- Legacy /create-post workspace redirect guard: ${decisionChecks.legacyCreatePostWorkspaceRedirect}`,
    `- Legacy personal social-tools visible module: ${decisionChecks.legacyPersonalSocialToolsVisibleModule}`,
    `- Legacy personal social-tools redirect-only guard: ${decisionChecks.legacyPersonalSocialToolsRedirectOnly}`,
    `- Commercial Forum/Q&A uses Forum/Q&A API, not Feed/Campaigns: ${decisionChecks.commercialCommunityForumOnly}`,
    `- Legacy /communities route is Forum/Q&A directory, not Feed/Campaigns: ${decisionChecks.legacyCommunitiesForumDirectory}`,
    `- Personal community tab uses Forum/Q&A APIs plus campaign placements: ${decisionChecks.personalCommunityForumOnly}`,
    `- Facility feed compatibility screen uses campaign route, not legacy posts feed: ${decisionChecks.facilityFeedCompatibilityCampaignOnly}`,
    `- Legacy native Feed screen uses campaign route, not social posts feed: ${decisionChecks.legacyFeedScreenCampaignOnly}`,
    `- Commercial Feed API creates campaigns through /api/commercial/feed: ${decisionChecks.commercialFeedApiCampaignEndpoint}`,
    `- Active Feed UI uses campaign API names, not legacy feed-post aliases: ${decisionChecks.activeFeedUiCampaignApiNames}`,
    `- Legacy api/posts client uses Forum/Q&A endpoints, not /api/posts: ${decisionChecks.legacyPostsApiForumOnly}`,
    `- Legacy native Tools screen uses connected Personal Tools / AI hub: ${decisionChecks.legacyToolsScreenPersonalHub}`,
    `- Legacy native Storefront screen uses canonical commercial storefront owner workspace: ${decisionChecks.legacyStorefrontScreenCommercialOwner}`,
    `- Facility integrations entry uses read-only room import preview: ${decisionChecks.facilityIntegrationsRoomImport}`,
    `- Shared source-link resolver covers task/timeline/dashboard workflow links: ${decisionChecks.sharedSourceResolverConnectedWorkflow}`,
    `- Top-level Tasks visible module: ${decisionChecks.topLevelTasksVisibleModule}`,
    `- Top-level Tasks uses shared Task Center/Schedule: ${decisionChecks.topLevelTasksTaskCenter}`,
    `- Facility Insights route exists: ${decisionChecks.facilityInsightsRouteExists}`,
    `- Commercial AI/business-helper copy hits outside build docs: ${decisionChecks.commercialAiCopyHits.length}`,
    "",
    "## Module Status",
    "",
    "| Phase | Module | Status | Route | Evidence files |",
    "| --- | --- | --- | --- | --- |",
    ...moduleRows.map((row) => {
      const evidence = row.evidenceFiles.length
        ? row.evidenceFiles.slice(0, 4).join("<br>")
        : "-";
      const route = row.expectedRoute
        ? `${row.expectedRoute} (${row.routeExists ? "found" : "missing"})`
        : "-";
      return `| ${row.phase} | ${row.name} | ${row.status} | ${route} | ${evidence} |`;
    }),
    ""
  ];

  fs.writeFileSync(
    path.join(OUT_DIR, "growpath-system-audit.md"),
    `${lines.join("\n")}\n`,
    "utf8"
  );

  console.log("Wrote:");
  console.log("- tmp/scan/growpath-system-audit.json");
  console.log("- tmp/scan/growpath-system-audit.md");
  console.log(`Modules: ${moduleRows.length}`);
  console.log(
    `Status: ${Object.entries(summary)
      .map(([key, value]) => `${key}=${value}`)
      .join(", ")}`
  );
}

main();
