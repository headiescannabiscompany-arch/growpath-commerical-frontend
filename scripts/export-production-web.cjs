const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const outputArgIndex = process.argv.findIndex((arg) => arg === "--out");
const outputDir =
  outputArgIndex >= 0 && process.argv[outputArgIndex + 1]
    ? process.argv[outputArgIndex + 1]
    : "dist";
const absoluteOutputDir = path.resolve(ROOT, outputDir);
const productionApiUrl =
  process.env.EXPO_PUBLIC_API_URL || "https://api.growpathai.com";

let parsedProductionApiUrl;
try {
  parsedProductionApiUrl = new URL(productionApiUrl);
} catch {
  console.error(
    `Invalid EXPO_PUBLIC_API_URL for production export: ${productionApiUrl}`
  );
  process.exit(1);
}

if (
  parsedProductionApiUrl.protocol !== "https:" ||
  parsedProductionApiUrl.hostname !== "api.growpathai.com"
) {
  console.error(
    "Production web export requires EXPO_PUBLIC_API_URL=https://api.growpathai.com"
  );
  console.error(`Received: ${productionApiUrl}`);
  process.exit(1);
}

const env = {
  ...process.env,
  NODE_ENV: "production",
  EXPO_PUBLIC_API_URL: productionApiUrl
};

const expoCli = path.join(ROOT, "node_modules", "expo", "bin", "cli");
const exportResult = spawnSync(
  process.execPath,
  [
    expoCli,
    "export",
    "--platform",
    "web",
    "--clear",
    "--output-dir",
    outputDir
  ],
  {
    cwd: ROOT,
    env,
    stdio: "inherit",
    shell: false
  }
);

if (exportResult.error) {
  console.error(`Failed to start Expo CLI: ${exportResult.error.message}`);
  process.exit(1);
}

if (exportResult.status !== 0) {
  process.exit(exportResult.status || 1);
}

const fallbackRoutes = [
  "login",
  "register",
  "courses",
  "store",
  "marketplace",
  "storefront",
  "profile",
  "facilities",
  "onboarding",
  "onboarding/create-facility",
  "home",
  "home/personal",
  "home/personal/courses",
  "home/personal/profile",
  "home/personal/community",
  "home/personal/forum",
  "home/personal/forum/new-post",
  "home/personal/grows",
  "home/personal/grows/new",
  "home/personal/tools",
  "home/personal/tools/vpd",
  "home/personal/tools/dew-point-guard",
  "home/personal/tools/ppfd",
  "home/personal/tools/bud-rot-risk",
  "home/personal/tools/npk",
  "home/personal/tools/nutrient-chemistry",
  "home/personal/tools/watering",
  "home/personal/tools/environment-analysis",
  "home/personal/tools/feeding-schedule",
  "home/personal/tools/harvest-estimator",
  "home/personal/tools/timeline-planner",
  "home/personal/tools/pdf-export",
  "home/personal/tools/pheno-matrix",
  "home/personal/tools/integrations",
  "home/personal/tools/crop-steering",
  "home/personal/diagnose",
  "home/facility",
  "home/facility/select",
  "home/facility/ai-ask",
  "home/facility/ai-diagnosis-photo",
  "home/facility/ai-template",
  "home/facility/ai-validation",
  "home/commercial"
];
const indexHtml = path.join(absoluteOutputDir, "index.html");

for (const route of fallbackRoutes) {
  const routeDir = path.join(absoluteOutputDir, route);
  fs.mkdirSync(routeDir, { recursive: true });
  fs.copyFileSync(indexHtml, path.join(routeDir, "index.html"));
}

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

const textFiles = walk(absoluteOutputDir).filter((file) =>
  /\.(html|js|json|txt)$/i.test(file)
);
const haystack = textFiles
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");

const forbidden = [
  "http://localhost:5002",
  "http://127.0.0.1:5002",
  "localhost:5002",
  "127.0.0.1:5002"
];
const foundForbidden = forbidden.filter((needle) => haystack.includes(needle));

if (!haystack.includes(productionApiUrl)) {
  console.error(`Production export missing API URL: ${productionApiUrl}`);
  process.exit(1);
}

if (foundForbidden.length) {
  console.error(
    `Production export contains forbidden local API URL(s): ${foundForbidden.join(", ")}`
  );
  process.exit(1);
}

console.log(
  `Production web export verified: ${outputDir} uses ${productionApiUrl}`
);
