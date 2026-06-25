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
