const { spawnSync } = require("child_process");
const http = require("http");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env.test") });

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:5001";

console.log(`🔍 Checking if backend is alive at ${API_URL}...`);

const checkBackend = () => {
  return new Promise((resolve) => {
    const req = http.get(`${API_URL}/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.end();
  });
};

async function main() {
  const isUp = await checkBackend();
  
  if (!isUp) {
    console.error("❌ Backend is not running. Please start it first (e.g., npm run backend:start)");
    process.exit(1);
  }

  console.log("✅ Backend detected! Running live acceptance tests...");

  const result = spawnSync("node", ["--test", "tests/acceptance/user_stories.test.js"], {
    env: { ...process.env, USE_LIVE_BACKEND: "true" },
    stdio: "inherit",
    shell: true
  });

  process.exit(result.status);
}

main();
